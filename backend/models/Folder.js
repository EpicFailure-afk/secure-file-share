const mongoose = require("mongoose")

const folderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // null parentFolder means the folder lives at the root level
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Fast lookups of a user's folders and of a folder's direct children
folderSchema.index({ userId: 1, parentFolder: 1 })

module.exports = mongoose.model("Folder", folderSchema)
