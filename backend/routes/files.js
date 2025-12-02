const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const File = require("../models/File")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const authMiddleware = require("../middleware/auth")
const { encryptFile, decryptFileToStream } = require("../utils/encryption")
const { sendShareVerificationEmail } = require("../utils/shareNotification")
const { calculateFileHash, verifyFileIntegrity } = require("../utils/fileIntegrity")
const { scanAndUpdateFile, scanBeforeDownload, getScanStatus } = require("../utils/virusScanner")
const { revokeFile, setFileExpiration, setDownloadLimit, formatRemainingTime } = require("../utils/fileExpiration")
const { logActivity, getActivityDescription } = require("../utils/activityTracker")

const router = express.Router()

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

    // Check user storage limit
    const user = await User.findById(req.user.userId)
    if (user.storageUsed + req.file.size > user.storageLimit) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: "Storage limit exceeded" })
    }

    const originalFilePath = req.file.path
    
    // Scan the original file BEFORE encryption (if ClamAV is available)
    let initialScanStatus = "clean"
    let initialScanResult = "Scan completed"
    try {
      const { scanFile, isClamAvAvailable } = require("../utils/virusScanner")
      const clamAvailable = await isClamAvAvailable()
      if (clamAvailable) {
        const scanResult = await scanFile(originalFilePath)
        if (!scanResult.clean) {
          // File is infected - delete it and reject upload
          fs.unlinkSync(originalFilePath)
          return res.status(400).json({ 
            error: `File rejected: Contains malware (${scanResult.result})`,
            scanResult: scanResult.result
          })
        }
        initialScanStatus = "clean"
        initialScanResult = scanResult.result
      }
    } catch (scanErr) {
      console.error("Pre-encryption scan error:", scanErr)
      // Continue with upload if scan fails - will be marked as pending
      initialScanStatus = "pending"
      initialScanResult = "Scan error - pending review"
    }

    // Generate encrypted file path
    const encryptedFilePath = originalFilePath + ".enc"

    // Encrypt the file with randomly selected algorithm
    const { iv, algorithm } = await encryptFile(originalFilePath, encryptedFilePath)

    // Calculate file hash AFTER encryption for integrity verification
    // This ensures we're comparing the same encrypted file later
    const fileHash = await calculateFileHash(encryptedFilePath)

    // Parse expiration from request (optional)
    let expiresAt = null
    if (req.body.expiresIn) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(req.body.expiresIn))
    }

    const newFile = new File({
      userId: req.user.userId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: encryptedFilePath,
      encryptionIv: iv,
      encryptionAlgorithm: algorithm,
      fileHash: fileHash,
      hashAlgorithm: "sha256",
      integrityVerified: true,
      lastIntegrityCheck: new Date(),
      expiresAt: expiresAt,
      maxDownloads: req.body.maxDownloads ? parseInt(req.body.maxDownloads) : null,
      scanStatus: initialScanStatus,
      scanDate: new Date(),
      scanResult: initialScanResult,
    })

    await newFile.save()

    // Update user storage
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { storageUsed: req.file.size },
    })

    // Log file upload
    await new AuditLog({
      userId: req.user.userId,
      action: "file_upload",
      targetType: "file",
      targetId: newFile._id,
      details: {
        fileName: newFile.fileName,
        fileSize: newFile.fileSize,
        fileType: newFile.fileType,
        encryptionAlgorithm: algorithm,
      },
      ipAddress: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      status: "success",
    }).save()

    // Log activity for organization monitoring
    if (user.organization) {
      await logActivity({
        organizationId: user.organization,
        userId: user._id,
        type: "file_upload",
        targetType: "file",
        targetId: newFile._id,
        targetName: newFile.fileName,
        description: getActivityDescription("file_upload", user.username, newFile.fileName),
        metadata: {
          fileSize: newFile.fileSize,
          fileType: newFile.fileType,
        },
        priority: "normal",
      })
    }

    // Note: Virus scan is now done BEFORE encryption, so no need for async scan

    res.status(201).json({
      file: {
        _id: newFile._id,
        fileName: newFile.fileName,
        fileType: newFile.fileType,
        fileSize: newFile.fileSize,
        uploadDate: newFile.uploadDate,
        expiresAt: newFile.expiresAt,
        scanStatus: newFile.scanStatus,
        integrityVerified: newFile.integrityVerified,
        encryptionAlgorithm: algorithm,
      },
      message: "File uploaded successfully",
    })
  } catch (err) {
    console.error("Error uploading file:", err)
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

    // Decrypt the file and get a read stream
    const { stream, cleanup } = await decryptFileToStream(file.filePath)

    // Increment download count
    await File.findByIdAndUpdate(file._id, {
      $inc: { downloadCount: 1 },
    })

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

    // Clean up the temporary file after streaming is complete
    stream.on("end", cleanup)
    stream.on("error", cleanup)
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

    // Get user info for logging
    const deleteUser = await User.findById(req.user.userId)
    const fileName = file.fileName
    const fileId = file._id

    // Delete file from storage
    fs.unlink(file.filePath, async (err) => {
      if (err) {
        console.error("Error deleting file from storage:", err)
      }

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
        details: { fileName: fileName },
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
    })
  } catch (err) {
    console.error("Error deleting file:", err)
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
router.post("/:id/expiration", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

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
router.post("/:id/lock", authMiddleware, async (req, res) => {
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
router.post("/:id/unlock", authMiddleware, async (req, res) => {
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
router.post("/:id/verify-lock", authMiddleware, async (req, res) => {
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
router.post("/:id/revoke", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

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
router.post("/:id/download-limit", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

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
    }).populate("userId", "username")

    if (!file) {
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
    })

    if (!file) {
      return res.status(404).json({ error: "Shared file not found or link expired" })
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

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
router.post("/share/:token/verify-access", async (req, res) => {
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

    // Decrypt the file and get a read stream
    const { stream, cleanup } = await decryptFileToStream(file.filePath)

    // Set appropriate headers
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`)
    res.setHeader("Content-Type", file.fileType)

    // Pipe the decrypted stream to the response
    stream.pipe(res)

    // Clean up the temporary file after streaming is complete
    stream.on("end", cleanup)
    stream.on("error", cleanup)
  } catch (err) {
    console.error("Error downloading shared file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router

