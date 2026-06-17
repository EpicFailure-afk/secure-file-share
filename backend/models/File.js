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
  // Folder this file lives in. null = root level.
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    default: null,
  },
  // Preview metadata, computed at upload time (best-effort, may be null)
  imageWidth: {
    type: Number,
    default: null,
  },
  imageHeight: {
    type: Number,
    default: null,
  },
  pageCount: {
    type: Number,
    default: null, // PDF page count
  },
  thumbnail: {
    type: String,
    default: null, // small base64 data-URL preview for images
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
  // Envelope encryption: the per-file Data Encryption Key (DEK) wrapped under a
  // versioned master Key Encryption Key (KEK) from the key vault. The raw DEK is
  // never stored. Legacy files (encrypted directly with the master key) leave
  // these null and decrypt via the legacy master-key path.
  dekWrapped: { type: String, default: null },
  dekWrapIv: { type: String, default: null },
  dekWrapTag: { type: String, default: null },
  kekVersion: { type: String, default: null },
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
    // "unavailable" = the file was NOT scanned because no working virus scanner
    // (ClamAV) was present — an honest placeholder so the UI never shows a fake
    // "clean" result for a file that was never actually scanned.
    type: String,
    enum: ["pending", "scanning", "clean", "infected", "error", "unavailable"],
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
  // File lock with password
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockPassword: {
    type: String,
    default: null, // Hashed password for file lock
  },
  lockedAt: {
    type: Date,
    default: null,
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  // Honey file (decoy). When true, ANY access to this file is treated as a
  // high-signal intrusion indicator: it raises a loud, emailed, real-time
  // security alert (see utils/securityAlerts.js). The file is still served so
  // an intruder never learns it was a trap. Planted/cleared by admins.
  isHoneyFile: {
    type: Boolean,
    default: false,
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

