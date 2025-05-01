const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const File = require("../models/File")
const User = require("../models/User")
const authMiddleware = require("../middleware/auth")
const { encryptFile, decryptFileToStream } = require("../utils/encryption")
const { sendShareVerificationEmail } = require("../utils/shareNotification")

const router = express.Router()

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Add file type restrictions if needed
    cb(null, true)
  },
})

//! Get all files for the authenticated user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const files = await File.find({ userId: req.user.userId }).sort({ uploadDate: -1 })
    res.json({ files })
  } catch (err) {
    console.error("Error fetching files:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Upload a file
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    // Generate encrypted file path
    const originalFilePath = req.file.path
    const encryptedFilePath = originalFilePath + ".enc"

    // Encrypt the file
    const { iv } = await encryptFile(originalFilePath, encryptedFilePath)

    const newFile = new File({
      userId: req.user.userId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: encryptedFilePath,
      encryptionIv: iv, // Store the IV for decryption later
    })

    await newFile.save()

    res.status(201).json({
      file: {
        _id: newFile._id,
        fileName: newFile.fileName,
        fileType: newFile.fileType,
        fileSize: newFile.fileSize,
        uploadDate: newFile.uploadDate,
      },
      message: "File uploaded successfully",
    })
  } catch (err) {
    console.error("Error uploading file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Download a file
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
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
    console.error("Error downloading file:", err)
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

    // Delete file from storage
    fs.unlink(file.filePath, async (err) => {
      if (err) {
        console.error("Error deleting file from storage:", err)
      }

      // Delete file from database
      await File.deleteOne({ _id: file._id })
      res.json({ message: "File deleted successfully" })
    })
  } catch (err) {
    console.error("Error deleting file:", err)
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

    // Generate a random token
    const shareToken = crypto.randomBytes(16).toString("hex")

    // Set expiry to 7 days from now
    const shareExpiry = new Date()
    shareExpiry.setDate(shareExpiry.getDate() + 7)

    // Update file with share token and expiry
    file.shareToken = shareToken
    file.shareExpiry = shareExpiry
    await file.save()

    // Generate share URL
    const shareUrl = `${"http://localhost:8800"}/share/${shareToken}`

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

