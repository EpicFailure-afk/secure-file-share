const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const File = require("../models/File")
const authMiddleware = require("../middleware/auth")

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

// Get all files for the authenticated user
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

    const newFile = new File({
      userId: req.user.userId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
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

// Download a file
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    res.download(file.filePath, file.fileName)
  } catch (err) {
    console.error("Error downloading file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete a file
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
    const shareUrl = `${process.env.APP_URL || "http://localhost:5173"}/share/${shareToken}`

    res.json({ shareUrl, expiresAt: shareExpiry })
  } catch (err) {
    console.error("Error generating share link:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Access shared file (public route)
router.get("/share/:token", async (req, res) => {
  try {
    const file = await File.findOne({
      shareToken: req.params.token,
      shareExpiry: { $gt: new Date() },
    })

    if (!file) {
      return res.status(404).json({ error: "Shared file not found or link expired" })
    }

    res.download(file.filePath, file.fileName)
  } catch (err) {
    console.error("Error accessing shared file:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router

