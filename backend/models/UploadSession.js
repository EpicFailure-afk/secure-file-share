const mongoose = require("mongoose")

// Tracks an in-progress chunked/resumable upload. Chunks are written to a temp
// directory keyed by uploadId; on completion they are assembled, scanned,
// encrypted and stored, then the session + temp dir are removed. Abandoned
// sessions expire automatically via the TTL index.
const uploadSessionSchema = new mongoose.Schema(
  {
    uploadId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, default: "application/octet-stream" },
    fileSize: { type: Number, required: true },
    totalChunks: { type: Number, required: true },
    // Indices of chunks successfully received (enables resume).
    receivedChunks: { type: [Number], default: [] },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    expiresInDays: { type: Number, default: null },
    maxDownloads: { type: Number, default: null },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    createdAt: { type: Date, default: Date.now },
  },
)

// Abandoned upload sessions self-destruct after 24h.
uploadSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 })

module.exports = mongoose.model("UploadSession", uploadSessionSchema)
