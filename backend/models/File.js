const mongoose = require("mongoose")

const fileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  shareToken: {
    type: String,
    default: null,
  },
  shareExpiry: {
    type: Date,
    default: null,
  },
  encryptionIv: {
    type: String,
    default: null,
  },
  encryptionAlgorithm: {
    type: String,
    enum: ["aes-256-cbc", "aes-256-gcm", "chacha20-poly1305"],
    default: "aes-256-cbc",
  },
  encryptionAuthTag: {
    type: String,
    default: null, // For GCM and ChaCha20 modes
  },
  // File integrity check fields
  fileHash: {
    type: String,
    default: null, // SHA-256 hash of original file
  },
  hashAlgorithm: {
    type: String,
    default: "sha256",
  },
  integrityVerified: {
    type: Boolean,
    default: true,
  },
  lastIntegrityCheck: {
    type: Date,
    default: null,
  },
  // File expiration and revocation fields
  expiresAt: {
    type: Date,
    default: null, // null means no expiration
  },
  isRevoked: {
    type: Boolean,
    default: false,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  revokeReason: {
    type: String,
    default: null,
  },
  // Virus scanning fields
  scanStatus: {
    type: String,
    enum: ["pending", "scanning", "clean", "infected", "error"],
    default: "pending",
  },
  scanDate: {
    type: Date,
    default: null,
  },
  scanResult: {
    type: String,
    default: null, // Will contain threat name if infected
  },
  // Verification fields
  verificationCode: {
    type: String,
    default: null,
  },
  verificationCodeExpiry: {
    type: Date,
    default: null,
  },
  accessGranted: [
    {
      ipAddress: String,
      accessTime: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  // Download tracking
  downloadCount: {
    type: Number,
    default: 0,
  },
  maxDownloads: {
    type: Number,
    default: null, // null means unlimited
  },
})

// Index for expired files cleanup
fileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Virtual to check if file is accessible
fileSchema.virtual("isAccessible").get(function () {
  if (this.isRevoked) return false
  if (this.expiresAt && this.expiresAt < new Date()) return false
  if (this.scanStatus === "infected") return false
  if (this.maxDownloads && this.downloadCount >= this.maxDownloads) return false
  return true
})

module.exports = mongoose.model("File", fileSchema)

