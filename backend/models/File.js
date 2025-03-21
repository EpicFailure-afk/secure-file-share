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
})

module.exports = mongoose.model("File", fileSchema)

