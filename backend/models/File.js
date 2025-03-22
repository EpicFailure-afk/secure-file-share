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
  // New fields for verification
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
})

module.exports = mongoose.model("File", fileSchema)

