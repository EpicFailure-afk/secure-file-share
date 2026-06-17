const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const File = require("../models/File")
const Folder = require("../models/Folder")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const UploadSession = require("../models/UploadSession")
const authMiddleware = require("../middleware/auth")
const { extractFileMetadata } = require("../utils/fileMetadata")
const { encryptFile, decryptFileToStream } = require("../utils/encryption")
const blobStorage = require("../utils/storage")
const keyVault = require("../utils/keyVault")
const { sendShareVerificationEmail } = require("../utils/shareNotification")
const { calculateFileHash, verifyFileIntegrity } = require("../utils/fileIntegrity")
const { scanAndUpdateFile, scanBeforeDownload, getScanStatus } = require("../utils/virusScanner")
const { revokeFile, setFileExpiration, setDownloadLimit, formatRemainingTime } = require("../utils/fileExpiration")
const { logActivity, getActivityDescription } = require("../utils/activityTracker")
const { honeyFileAccessed } = require("../utils/securityAlerts")
const { generateOtp } = require("../utils/otp")
const { validate } = require("../middleware/validate")
const { files: fileSchemas, idParam } = require("../validators/schemas")

const router = express.Router()

// When a file is locked, EVERY action on it (download, share, move, delete,
// integrity check, expiration, revoke, etc.) is denied until it is unlocked via
// the dedicated /unlock endpoint. This is enforced server-side on every action
// route so the lock cannot be bypassed by calling the API directly. Returns true
// (and sends the 403) when the file is locked, so callers can `if (...) return`.
const denyIfLocked = (file, res) => {
  if (file && file.isLocked) {
    res.status(403).json({
      error: "This file is locked. Unlock it first to perform this action.",
      isLocked: true,
    })
    return true
  }
  return false
}

// Maximum file size (500MB)
const MAX_FILE_SIZE = 500 * 1024 * 1024

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + "-" + file.originalname)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Allow all file types
    cb(null, true)
  },
})

//! Get all files for the authenticated user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const files = await File.find({ 
      userId: req.user.userId,
      isRevoked: false,
    }).sort({ uploadDate: -1 })
    res.json({ files })
  } catch (err) {
    console.error("Error fetching files:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Shared upload pipeline used by BOTH the single-shot upload and the chunked
// "complete" step: scan plaintext → extract preview metadata → encrypt → hash →
// store the encrypted blob → create the File document → audit + activity.
// Takes a plaintext file already on local disk and the file's metadata.
// Returns { ok:true, responseFile, scanned } or { ok:false, status, body } for
// quota/infection rejections (the plaintext is cleaned up in every path).
const finalizeUpload = async ({
  user,
  plaintextPath,
  originalName,
  mimeType,
  size,
  folderId,
  expiresInDays,
  maxDownloads,
  ip,
}) => {
  // Storage quota
  if (user.storageUsed + size > user.storageLimit) {
    fs.existsSync(plaintextPath) && fs.unlinkSync(plaintextPath)
    return { ok: false, status: 400, body: { error: "Storage limit exceeded" } }
  }

  // Scan the plaintext BEFORE encryption. Record "clean" only on a real
  // successful scan; otherwise stay honest with "unavailable".
  let scanStatus = "unavailable"
  let scanResultMsg = "Not scanned — virus scanner (ClamAV) is not active on this server"
  try {
    const { scanFile, isClamAvAvailable } = require("../utils/virusScanner")
    if (await isClamAvAvailable()) {
      const scanResult = await scanFile(plaintextPath)
      if (!scanResult.clean) {
        fs.existsSync(plaintextPath) && fs.unlinkSync(plaintextPath)
        return {
          ok: false,
          status: 400,
          body: { error: `File rejected: Contains malware (${scanResult.result})`, scanResult: scanResult.result },
        }
      }
      scanStatus = "clean"
      scanResultMsg = scanResult.result
    }
  } catch (scanErr) {
    console.error("Pre-encryption scan error:", scanErr)
    scanStatus = "unavailable"
    scanResultMsg = `Not scanned — virus scan could not be completed (${scanErr.message})`
  }

  // Preview metadata from the plaintext (best-effort)
  const previewMeta = await extractFileMetadata(plaintextPath, mimeType)

  // Envelope encryption: encrypt the file with a fresh per-file DEK, then wrap
  // the DEK under the active versioned KEK from the vault. Only the wrapped DEK
  // is stored, never the raw DEK.
  const dek = keyVault.generateDek()
  const encryptedFilePath = plaintextPath + ".enc"
  const { iv, algorithm, authTag } = await encryptFile(plaintextPath, encryptedFilePath, dek)
  const fileHash = await calculateFileHash(encryptedFilePath)
  const storageKey = await blobStorage.save(encryptedFilePath)
  const wrappedDek = keyVault.wrapDek(dek)

  let expiresAt = null
  if (expiresInDays) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays))
  }

  const newFile = new File({
    userId: user._id,
    fileName: originalName,
    fileType: mimeType,
    fileSize: size,
    filePath: storageKey,
    folderId: folderId,
    imageWidth: previewMeta.imageWidth || null,
    imageHeight: previewMeta.imageHeight || null,
    pageCount: previewMeta.pageCount || null,
    thumbnail: previewMeta.thumbnail || null,
    encryptionIv: iv,
    encryptionAlgorithm: algorithm,
    encryptionAuthTag: authTag,
    dekWrapped: wrappedDek.wrapped,
    dekWrapIv: wrappedDek.iv,
    dekWrapTag: wrappedDek.tag,
    kekVersion: wrappedDek.version,
    fileHash: fileHash,
    hashAlgorithm: "sha256",
    integrityVerified: true,
    lastIntegrityCheck: new Date(),
    expiresAt: expiresAt,
    maxDownloads: maxDownloads ? parseInt(maxDownloads) : null,
    scanStatus: scanStatus,
    scanDate: new Date(),
    scanResult: scanResultMsg,
  })
  await newFile.save()

  await User.findByIdAndUpdate(user._id, { $inc: { storageUsed: size } })

  await new AuditLog({
    userId: user._id,
    action: "file_upload",
    targetType: "file",
    targetId: newFile._id,
    details: { fileName: newFile.fileName, fileSize: newFile.fileSize, fileType: newFile.fileType, encryptionAlgorithm: algorithm },
    ipAddress: ip,
    status: "success",
  }).save()

  if (user.organization) {
    await logActivity({
      organizationId: user.organization,
      userId: user._id,
      type: "file_upload",
      targetType: "file",
      targetId: newFile._id,
      targetName: newFile.fileName,
      description: getActivityDescription("file_upload", user.username, newFile.fileName),
      metadata: { fileSize: newFile.fileSize, fileType: newFile.fileType },
      priority: "normal",
    })
  }

  return {
    ok: true,
    scanned: newFile.scanStatus === "clean",
    responseFile: {
      _id: newFile._id,
      fileName: newFile.fileName,
      fileType: newFile.fileType,
      fileSize: newFile.fileSize,
      folderId: newFile.folderId,
      imageWidth: newFile.imageWidth,
      imageHeight: newFile.imageHeight,
      pageCount: newFile.pageCount,
      thumbnail: newFile.thumbnail,
      uploadDate: newFile.uploadDate,
      expiresAt: newFile.expiresAt,
      scanStatus: newFile.scanStatus,
      scanResult: newFile.scanResult,
      integrityVerified: newFile.integrityVerified,
      encryptionAlgorithm: algorithm,
    },
  }
}

// Upload a file with enhanced error handling
router.post("/upload", authMiddleware, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}` 
          })
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` })
      }
      return res.status(400).json({ error: err.message })
    }
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    const user = await User.findById(req.user.userId)

    // Resolve optional destination folder (must belong to the user)
    let folderId = null
    if (req.body.folderId) {
      const folder = await Folder.findOne({ _id: req.body.folderId, userId: req.user.userId })
      if (!folder) {
        fs.unlinkSync(req.file.path)
        return res.status(400).json({ error: "Destination folder not found" })
      }
      folderId = folder._id
    }

    const result = await finalizeUpload({
      user,
      plaintextPath: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      folderId,
      expiresInDays: req.body.expiresIn,
      maxDownloads: req.body.maxDownloads,
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    })

    if (!result.ok) {
      return res.status(result.status).json(result.body)
    }

    res.status(201).json({
      file: result.responseFile,
      // Explicit scan outcome so the frontend can show the correct result.
      // scanStatus: "clean" (passed), "unavailable" (scanner not active).
      // Infected files never reach here — they're rejected with HTTP 400 above.
      scanned: result.scanned,
      message: "File uploaded successfully",
    })
  } catch (err) {
    console.error("Error uploading file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// ---------------------------------------------------------------------------
// Chunked / resumable uploads
//
// Flow: init → (PUT chunk)* → complete. Chunks are written to a per-session
// temp directory; complete assembles them into one plaintext file and runs the
// SAME finalizeUpload pipeline (scan → encrypt → store), so the security model
// (scan-before-encrypt) is identical to single-shot uploads. A client can call
// status to learn which chunks already landed and resume after an interruption.
// ---------------------------------------------------------------------------

const CHUNKS_ROOT = path.join(__dirname, "../uploads/.chunks")
const chunkDirFor = (uploadId) => path.join(CHUNKS_ROOT, uploadId)

//! Initialize a chunked upload session
router.post("/upload/init", authMiddleware, validate({ body: fileSchemas.uploadInit }), async (req, res) => {
  try {
    const { fileName, fileType, fileSize, totalChunks, folderId, expiresIn, maxDownloads } = req.body

    const user = await User.findById(req.user.userId)
    if (user.storageUsed + fileSize > user.storageLimit) {
      return res.status(400).json({ error: "Storage limit exceeded" })
    }

    // Validate destination folder ownership up front
    let resolvedFolderId = null
    if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, userId: req.user.userId })
      if (!folder) return res.status(400).json({ error: "Destination folder not found" })
      resolvedFolderId = folder._id
    }

    const uploadId = crypto.randomBytes(16).toString("hex")
    fs.mkdirSync(chunkDirFor(uploadId), { recursive: true })

    await UploadSession.create({
      uploadId,
      userId: req.user.userId,
      fileName,
      fileType: fileType || "application/octet-stream",
      fileSize,
      totalChunks,
      folderId: resolvedFolderId,
      expiresInDays: expiresIn || null,
      maxDownloads: maxDownloads || null,
    })

    res.status(201).json({ uploadId, received: [] })
  } catch (err) {
    console.error("Error initializing chunked upload:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Resume support — which chunk indices have already been received
router.get("/upload/:uploadId/status", authMiddleware, async (req, res) => {
  try {
    const session = await UploadSession.findOne({ uploadId: req.params.uploadId, userId: req.user.userId })
    if (!session) return res.status(404).json({ error: "Upload session not found" })
    res.json({ uploadId: session.uploadId, received: session.receivedChunks, totalChunks: session.totalChunks })
  } catch (err) {
    console.error("Error fetching upload status:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Upload a single chunk (raw octet-stream body). Idempotent per index.
router.put(
  "/upload/:uploadId/chunk/:index",
  authMiddleware,
  express.raw({ type: () => true, limit: "20mb" }),
  async (req, res) => {
    try {
      const index = parseInt(req.params.index, 10)
      if (!Number.isInteger(index) || index < 0) {
        return res.status(400).json({ error: "Invalid chunk index" })
      }
      const session = await UploadSession.findOne({ uploadId: req.params.uploadId, userId: req.user.userId })
      if (!session) return res.status(404).json({ error: "Upload session not found" })
      if (index >= session.totalChunks) {
        return res.status(400).json({ error: "Chunk index out of range" })
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "Empty chunk body" })
      }

      const dir = chunkDirFor(session.uploadId)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, `${index}.part`), req.body)

      if (!session.receivedChunks.includes(index)) {
        session.receivedChunks.push(index)
        await session.save()
      }

      res.json({ received: session.receivedChunks.length, totalChunks: session.totalChunks })
    } catch (err) {
      console.error("Error storing chunk:", err)
      res.status(500).json({ error: "Server error" })
    }
  },
)

//! Complete a chunked upload — assemble, scan, encrypt, store
router.post("/upload/:uploadId/complete", authMiddleware, async (req, res) => {
  const cleanupChunks = (dir) => {
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
  }

  try {
    const session = await UploadSession.findOne({ uploadId: req.params.uploadId, userId: req.user.userId })
    if (!session) return res.status(404).json({ error: "Upload session not found" })

    const dir = chunkDirFor(session.uploadId)

    // All chunks must be present
    if (session.receivedChunks.length !== session.totalChunks) {
      return res.status(400).json({
        error: "Upload incomplete — some chunks are missing",
        received: session.receivedChunks,
        totalChunks: session.totalChunks,
      })
    }

    // Assemble chunks in order into one plaintext file
    const assembledPath = path.join(dir, "assembled")
    const writeStream = fs.createWriteStream(assembledPath)
    for (let i = 0; i < session.totalChunks; i++) {
      const partPath = path.join(dir, `${i}.part`)
      if (!fs.existsSync(partPath)) {
        writeStream.destroy()
        cleanupChunks(dir)
        await UploadSession.deleteOne({ _id: session._id })
        return res.status(400).json({ error: `Missing chunk ${i}` })
      }
      await new Promise((resolve, reject) => {
        const rs = fs.createReadStream(partPath)
        rs.on("error", reject)
        rs.on("end", resolve)
        rs.pipe(writeStream, { end: false })
      })
    }
    await new Promise((resolve) => writeStream.end(resolve))

    const user = await User.findById(req.user.userId)

    // Run the shared pipeline (scan → encrypt → store → File doc). It consumes
    // (and deletes) the assembled plaintext.
    const result = await finalizeUpload({
      user,
      plaintextPath: assembledPath,
      originalName: session.fileName,
      mimeType: session.fileType,
      size: session.fileSize,
      folderId: session.folderId,
      expiresInDays: session.expiresInDays,
      maxDownloads: session.maxDownloads,
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    })

    cleanupChunks(dir)
    await UploadSession.deleteOne({ _id: session._id })

    if (!result.ok) {
      return res.status(result.status).json(result.body)
    }

    res.status(201).json({
      file: result.responseFile,
      scanned: result.scanned,
      message: "File uploaded successfully",
    })
  } catch (err) {
    console.error("Error completing chunked upload:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Abort a chunked upload (cleanup)
router.delete("/upload/:uploadId", authMiddleware, async (req, res) => {
  try {
    const session = await UploadSession.findOne({ uploadId: req.params.uploadId, userId: req.user.userId })
    if (session) {
      try { fs.rmSync(chunkDirFor(session.uploadId), { recursive: true, force: true }) } catch { /* ignore */ }
      await UploadSession.deleteOne({ _id: session._id })
    }
    res.json({ message: "Upload aborted" })
  } catch (err) {
    console.error("Error aborting upload:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Download a file with real-time virus scan
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    // Check if file is locked
    if (file.isLocked) {
      return res.status(403).json({ error: "File is locked. Please provide the password to download.", isLocked: true })
    }

    // Check if file is accessible
    if (file.isRevoked) {
      return res.status(403).json({ error: "File has been revoked" })
    }

    if (file.expiresAt && file.expiresAt < new Date()) {
      return res.status(403).json({ error: "File has expired" })
    }

    if (file.maxDownloads && file.downloadCount >= file.maxDownloads) {
      return res.status(403).json({ error: "Download limit reached" })
    }

    // Skip real-time scan if query parameter is set (for pre-scanned downloads)
    const skipScan = req.query.skipScan === "true"
    let scanInfo = null
    
    if (!skipScan) {
      // Perform real-time virus scan before download
      const ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress
      const scanResult = await scanBeforeDownload(file._id, req.user.userId, ipAddress)
      scanInfo = scanResult.scanResult
      
      if (!scanResult.allowed) {
        return res.status(403).json({
          error: scanResult.message,
          scanResult: scanResult.scanResult,
        })
      }
    }

    // Pull the encrypted blob from storage (no-op for local, downloads a temp
    // for MinIO) then decrypt it (GCM for new files; legacy CBC falls back).
    const src = await blobStorage.fetchToTemp(file.filePath)
    const { stream, cleanup } = await decryptFileToStream(src.path, {
      algorithm: file.encryptionAlgorithm,
      authTag: file.encryptionAuthTag,
      key: keyVault.resolveFileKey(file),
    })
    const cleanupAll = () => { cleanup(); src.cleanup() }

    // Increment download count
    await File.findByIdAndUpdate(file._id, {
      $inc: { downloadCount: 1 },
    })

    // Honey file: accessing a decoy is a high-signal intrusion indicator. Alert
    // loudly but still serve the file so the intruder never learns it was a trap.
    if (file.isHoneyFile) {
      honeyFileAccessed({
        file,
        userId: req.user.userId,
        ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        via: "authenticated download",
      }).catch(() => {})
    }

    // Log download
    await new AuditLog({
      userId: req.user.userId,
      action: "file_download",
      targetType: "file",
      targetId: file._id,
      details: { fileName: file.fileName },
      ipAddress: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      status: "success",
    }).save()

    // Log activity for organization monitoring
    const downloadUser = await User.findById(req.user.userId)
    if (downloadUser && downloadUser.organization) {
      await logActivity({
        organizationId: downloadUser.organization,
        userId: downloadUser._id,
        type: "file_download",
        targetType: "file",
        targetId: file._id,
        targetName: file.fileName,
        description: getActivityDescription("file_download", downloadUser.username, file.fileName),
        metadata: {
          fileSize: file.fileSize,
          fileType: file.fileType,
        },
        priority: "normal",
      })
    }

    // Set appropriate headers
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`)
    res.setHeader("Content-Type", file.fileType)
    
    // Set scan info headers for frontend
    if (scanInfo) {
      res.setHeader("X-Scan-Status", scanInfo.status || "unknown")
      res.setHeader("X-Scan-Safe", scanInfo.status === "clean" ? "true" : "false")
      res.setHeader("X-Scan-Time", scanInfo.scanTimeMs ? String(scanInfo.scanTimeMs) : "0")
      res.setHeader("X-Scan-Message", scanInfo.message || "Scan completed")
    }
    
    // Expose custom headers to frontend
    res.setHeader("Access-Control-Expose-Headers", "X-Scan-Status, X-Scan-Safe, X-Scan-Time, X-Scan-Message")

    // Pipe the decrypted stream to the response
    stream.pipe(res)

    // Clean up the temporary file(s) after streaming is complete
    stream.on("end", cleanupAll)
    stream.on("error", cleanupAll)
  } catch (err) {
    console.error("Error downloading file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Pre-scan file before download (separate endpoint for UI feedback)
router.post("/:id/pre-scan", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (denyIfLocked(file, res)) return

    const ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress
    const scanResult = await scanBeforeDownload(file._id, req.user.userId, ipAddress)

    res.json({
      allowed: scanResult.allowed,
      message: scanResult.message,
      scanResult: scanResult.scanResult,
      fileName: file.fileName,
    })
  } catch (err) {
    console.error("Error pre-scanning file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Delete a file
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (denyIfLocked(file, res)) return

    // Get user info for logging
    const deleteUser = await User.findById(req.user.userId)
    const fileName = file.fileName
    const fileId = file._id

    // Crypto-erase: the wrapped DEK exists ONLY on this File document, so
    // deleting the document (below) destroys the sole copy of the file's key,
    // making the ciphertext permanently unrecoverable even if a blob backup
    // survives. We also remove the blob itself (best-effort).
    const cryptoErased = Boolean(file.dekWrapped)
    await blobStorage.remove(file.filePath)

    // Update user storage
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { storageUsed: -file.fileSize },
    })

    // Log deletion
    await new AuditLog({
      userId: req.user.userId,
      action: "file_delete",
      targetType: "file",
      targetId: fileId,
      details: { fileName: fileName, cryptoErased },
      ipAddress: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      status: "success",
    }).save()

    // Log activity for organization monitoring
    if (deleteUser && deleteUser.organization) {
      await logActivity({
        organizationId: deleteUser.organization,
        userId: deleteUser._id,
        type: "file_delete",
        targetType: "file",
        targetId: fileId,
        targetName: fileName,
        description: getActivityDescription("file_delete", deleteUser.username, fileName),
        priority: "normal",
      })
    }

    // Delete file from database
    await File.deleteOne({ _id: fileId })
    res.json({ message: "File deleted successfully" })
  } catch (err) {
    console.error("Error deleting file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Move a file into a folder (folderId null = root)
router.patch("/:id/move", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user.userId })
    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (denyIfLocked(file, res)) return

    let folderId = null
    if (req.body.folderId) {
      const folder = await Folder.findOne({ _id: req.body.folderId, userId: req.user.userId })
      if (!folder) {
        return res.status(400).json({ error: "Destination folder not found" })
      }
      folderId = folder._id
    }

    file.folderId = folderId
    await file.save()

    res.json({ message: "File moved", folderId })
  } catch (err) {
    console.error("Error moving file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Verify file integrity with access and modification history
router.get("/:id/verify-integrity", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).populate("userId", "username email")

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (denyIfLocked(file, res)) return

    const result = await verifyFileIntegrity(file._id)

    // Get audit logs for this file (access and modifications)
    const auditLogs = await AuditLog.find({
      targetId: file._id,
      targetType: "file",
    })
      .populate("userId", "username email")
      .sort({ timestamp: -1 })
      .limit(50)

    // Format access history
    const accessHistory = auditLogs
      .filter(log => ["file_download", "file_view", "file_share"].includes(log.action))
      .map(log => ({
        action: log.action,
        user: log.userId ? log.userId.username : "Unknown",
        email: log.userId ? log.userId.email : null,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress || "Unknown",
      }))

    // Format modification history
    const modificationHistory = auditLogs
      .filter(log => ["file_upload", "file_update", "file_rename", "file_integrity_check"].includes(log.action))
      .map(log => ({
        action: log.action,
        user: log.userId ? log.userId.username : "System",
        email: log.userId ? log.userId.email : null,
        timestamp: log.timestamp,
        details: log.details || {},
      }))

    // Include shared access records
    const sharedAccess = file.accessGranted.map(access => ({
      action: "shared_download",
      ipAddress: access.ipAddress,
      timestamp: access.accessTime,
    }))

    res.json({
      ...result,
      fileInfo: {
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        uploadDate: file.uploadDate,
        owner: file.userId ? file.userId.username : "Unknown",
        ownerEmail: file.userId ? file.userId.email : null,
        lastIntegrityCheck: file.lastIntegrityCheck,
        downloadCount: file.downloadCount,
        isLocked: file.isLocked || false,
      },
      accessHistory,
      modificationHistory,
      sharedAccess,
    })
  } catch (err) {
    console.error("Error verifying file integrity:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Set file expiration with flexible time units
router.post("/:id/expiration", authMiddleware, validate({ params: idParam, body: fileSchemas.expiration }), async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (denyIfLocked(file, res)) return

    const { value, unit } = req.body // { value: 30, unit: 'minutes' }
    
    // Support legacy format (expiresIn as days)
    const expirationValue = value || req.body.expiresIn
    const expirationUnit = unit || "days"
    
    const result = await setFileExpiration(file._id, parseInt(expirationValue), expirationUnit)

    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ 
      message: result.message, 
      expiresAt: result.expiresAt,
      remaining: result.remaining 
    })
  } catch (err) {
    console.error("Error setting file expiration:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Lock file with password
router.post("/:id/lock", authMiddleware, validate({ params: idParam, body: fileSchemas.lockPassword }), async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    const { password } = req.body
    
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" })
    }

    // Hash the password
    const bcrypt = require("bcryptjs")
    const hashedPassword = await bcrypt.hash(password, 10)

    await File.findByIdAndUpdate(file._id, {
      isLocked: true,
      lockPassword: hashedPassword,
      lockedAt: new Date(),
      lockedBy: req.user.userId,
    })

    // Log the action
    await new AuditLog({
      userId: req.user.userId,
      action: "file_lock",
      targetType: "file",
      targetId: file._id,
      details: { fileName: file.fileName },
      ipAddress: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      status: "success",
    }).save()

    res.json({ message: "File locked successfully" })
  } catch (err) {
    console.error("Error locking file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Unlock file with password
router.post("/:id/unlock", authMiddleware, validate({ params: idParam, body: fileSchemas.unlockPassword }), async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (!file.isLocked) {
      return res.status(400).json({ error: "File is not locked" })
    }

    const { password } = req.body
    
    if (!password) {
      return res.status(400).json({ error: "Password is required" })
    }

    // Verify the password
    const bcrypt = require("bcryptjs")
    const isMatch = await bcrypt.compare(password, file.lockPassword)

    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" })
    }

    await File.findByIdAndUpdate(file._id, {
      isLocked: false,
      lockPassword: null,
      lockedAt: null,
      lockedBy: null,
    })

    // Log the action
    await new AuditLog({
      userId: req.user.userId,
      action: "file_unlock",
      targetType: "file",
      targetId: file._id,
      details: { fileName: file.fileName },
      ipAddress: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      status: "success",
    }).save()

    res.json({ message: "File unlocked successfully" })
  } catch (err) {
    console.error("Error unlocking file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Verify file lock password (for download)
router.post("/:id/verify-lock", authMiddleware, validate({ params: idParam, body: fileSchemas.unlockPassword }), async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (!file.isLocked) {
      return res.json({ verified: true, message: "File is not locked" })
    }

    const { password } = req.body
    
    if (!password) {
      return res.status(400).json({ error: "Password is required", verified: false })
    }

    // Verify the password
    const bcrypt = require("bcryptjs")
    const isMatch = await bcrypt.compare(password, file.lockPassword)

    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password", verified: false })
    }

    res.json({ verified: true, message: "Password verified" })
  } catch (err) {
    console.error("Error verifying lock password:", err)
    res.status(500).json({ error: "Server error", verified: false })
  }
})

// Revoke file access
router.post("/:id/revoke", authMiddleware, validate({ params: idParam, body: fileSchemas.revoke }), async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (denyIfLocked(file, res)) return

    const { reason } = req.body
    const result = await revokeFile(file._id, req.user.userId, reason)

    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ message: result.message })
  } catch (err) {
    console.error("Error revoking file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Set download limit
router.post("/:id/download-limit", authMiddleware, validate({ params: idParam, body: fileSchemas.downloadLimit }), async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    if (denyIfLocked(file, res)) return

    const { maxDownloads } = req.body
    const result = await setDownloadLimit(file._id, parseInt(maxDownloads))

    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ message: result.message })
  } catch (err) {
    console.error("Error setting download limit:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get file scan status
router.get("/:id/scan-status", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    res.json({
      scanStatus: file.scanStatus,
      scanDate: file.scanDate,
      scanResult: file.scanResult,
    })
  } catch (err) {
    console.error("Error getting scan status:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Generate share link for a file
router.post("/:id/share", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    // Check if file is locked
    if (file.isLocked) {
      return res.status(403).json({ error: "Cannot share a locked file. Please unlock it first.", isLocked: true })
    }

    // Generate a random token
    const shareToken = crypto.randomBytes(16).toString("hex")

    // Set expiry to 7 days from now
    const shareExpiry = new Date()
    shareExpiry.setDate(shareExpiry.getDate() + 7)

    // Update file with share token and expiry
    file.shareToken = shareToken
    file.shareExpiry = shareExpiry
    await file.save()

    // Log activity for organization monitoring
    const shareUser = await User.findById(req.user.userId)
    if (shareUser && shareUser.organization) {
      await logActivity({
        organizationId: shareUser.organization,
        userId: shareUser._id,
        type: "file_share",
        targetType: "file",
        targetId: file._id,
        targetName: file.fileName,
        description: getActivityDescription("file_share", shareUser.username, file.fileName),
        metadata: {
          shareType: "link",
          expiresAt: shareExpiry,
        },
        priority: "normal",
      })
    }

    // Generate share URL
    // const shareUrl = `${process.env.APP_URL || "http://localhost:5173"}/share/${shareToken}`
    const shareUrl = `http://localhost:8800/share/${shareToken}`

    res.json({ shareUrl, expiresAt: shareExpiry })
  } catch (err) {
    console.error("Error generating share link:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get shared file info (public route)
router.get("/share/:token/info", async (req, res) => {
  try {
    const file = await File.findOne({
      shareToken: req.params.token,
      shareExpiry: { $gt: new Date() },
      isRevoked: false,
    }).populate("userId", "username")

    if (!file) {
      return res.status(404).json({ error: "Shared file not found or link expired" })
    }

    if (file.expiresAt && file.expiresAt < new Date()) {
      return res.status(404).json({ error: "Shared file not found or link expired" })
    }

    // Return basic file info
    res.json({
      fileInfo: {
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        ownerName: file.userId.username,
      },
    })
  } catch (err) {
    console.error("Error getting shared file info:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Request access to shared file (public route)
router.post("/share/:token/request-access", async (req, res) => {
  try {
    const file = await File.findOne({
      shareToken: req.params.token,
      shareExpiry: { $gt: new Date() },
      isRevoked: false,
    })

    if (!file) {
      return res.status(404).json({ error: "Shared file not found or link expired" })
    }

    if (file.expiresAt && file.expiresAt < new Date()) {
      return res.status(404).json({ error: "Shared file not found or link expired" })
    }

    // Generate a strong mixed-character-class verification code (CSPRNG,
    // case-sensitive). Replaces the old Math.random() 6-digit number.
    const verificationCode = generateOtp(8)

    // Set expiry to 30 minutes from now
    const verificationCodeExpiry = new Date()
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 30)

    // Update file with verification code
    file.verificationCode = verificationCode
    file.verificationCodeExpiry = verificationCodeExpiry
    await file.save()

    // Get requester IP address
    const requesterIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress

    // Send verification email to file owner
    const emailSent = await sendShareVerificationEmail(file.userId, file.fileName, verificationCode, requesterIP)

    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send verification email" })
    }

    res.json({
      message: "Access request sent to file owner",
      expiresAt: verificationCodeExpiry,
    })
  } catch (err) {
    console.error("Error requesting file access:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Verify access code for shared file (public route)
router.post("/share/:token/verify-access", validate({ body: fileSchemas.verifyAccess }), async (req, res) => {
  try {
    const { verificationCode } = req.body

    if (!verificationCode) {
      return res.status(400).json({ error: "Verification code is required" })
    }

    const file = await File.findOne({
      shareToken: req.params.token,
      shareExpiry: { $gt: new Date() },
      verificationCode: verificationCode,
      verificationCodeExpiry: { $gt: new Date() },
    })

    if (!file) {
      return res.status(400).json({ error: "Invalid or expired verification code" })
    }

    // Get requester IP address
    const requesterIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress

    // Add to access granted list
    file.accessGranted.push({
      ipAddress: requesterIP,
      accessTime: new Date(),
    })

    await file.save()

    res.json({
      success: true,
      message: "Access granted",
    })
  } catch (err) {
    console.error("Error verifying access code:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Download shared file with verification (public route)
router.get("/share/:token/download", async (req, res) => {
  try {
    const { code } = req.query

    if (!code) {
      return res.status(400).json({ error: "Verification code is required" })
    }

    const file = await File.findOne({
      shareToken: req.params.token,
      shareExpiry: { $gt: new Date() },
      verificationCode: code,
      verificationCodeExpiry: { $gt: new Date() },
    })

    if (!file) {
      return res.status(400).json({ error: "Invalid or expired verification code" })
    }

    // The public share path must enforce the SAME access controls as the
    // authenticated download route — a share link must never bypass
    // revocation, file expiration, infection status, download limits or locks.
    if (file.isRevoked) {
      return res.status(403).json({ error: "File has been revoked" })
    }

    if (file.expiresAt && file.expiresAt < new Date()) {
      return res.status(403).json({ error: "File has expired" })
    }

    if (file.scanStatus === "infected") {
      return res.status(403).json({ error: "File is blocked: it failed the security scan" })
    }

    if (file.maxDownloads && file.downloadCount >= file.maxDownloads) {
      return res.status(403).json({ error: "Download limit reached" })
    }

    if (denyIfLocked(file, res)) return

    // Honey file accessed over a public share link — alert loudly, still serve.
    if (file.isHoneyFile) {
      honeyFileAccessed({
        file,
        userId: file.userId,
        ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        via: "share link",
      }).catch(() => {})
    }

    // Pull from storage then decrypt (GCM or legacy CBC)
    const src = await blobStorage.fetchToTemp(file.filePath)
    const { stream, cleanup } = await decryptFileToStream(src.path, {
      algorithm: file.encryptionAlgorithm,
      authTag: file.encryptionAuthTag,
      key: keyVault.resolveFileKey(file),
    })
    const cleanupAll = () => { cleanup(); src.cleanup() }

    // Shared downloads count against the file's download limit too
    await File.findByIdAndUpdate(file._id, {
      $inc: { downloadCount: 1 },
    })

    // Set appropriate headers
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`)
    res.setHeader("Content-Type", file.fileType)

    // Pipe the decrypted stream to the response
    stream.pipe(res)

    // Clean up the temporary file(s) after streaming is complete
    stream.on("end", cleanupAll)
    stream.on("error", cleanupAll)
  } catch (err) {
    console.error("Error downloading shared file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router

