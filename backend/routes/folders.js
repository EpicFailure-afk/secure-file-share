const express = require("express")
const fs = require("fs")
const Folder = require("../models/Folder")
const File = require("../models/File")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const authMiddleware = require("../middleware/auth")
const { logActivity, getActivityDescription } = require("../utils/activityTracker")

const router = express.Router()

// Validate that a folder id (if provided) exists and belongs to the user.
// Returns the folder doc, or null for root (folderId null/undefined/"" ).
const resolveOwnedFolder = async (folderId, userId) => {
  if (!folderId) return { ok: true, folder: null }
  const folder = await Folder.findOne({ _id: folderId, userId })
  if (!folder) return { ok: false }
  return { ok: true, folder }
}

//! Get all folders for the authenticated user (flat list; client builds the tree)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user.userId }).sort({ name: 1 })
    res.json({ folders })
  } catch (err) {
    console.error("Error fetching folders:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Create a folder
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, parentFolder } = req.body
    const trimmed = (name || "").trim()
    if (!trimmed) return res.status(400).json({ error: "Folder name is required" })
    if (trimmed.length > 120) return res.status(400).json({ error: "Folder name is too long" })

    const parent = await resolveOwnedFolder(parentFolder, req.user.userId)
    if (!parent.ok) return res.status(400).json({ error: "Parent folder not found" })

    const folder = await new Folder({
      userId: req.user.userId,
      name: trimmed,
      parentFolder: parent.folder ? parent.folder._id : null,
    }).save()

    res.status(201).json({ folder, message: "Folder created" })
  } catch (err) {
    console.error("Error creating folder:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Collect a folder and all of its descendant folder ids (BFS over the user's folders)
const collectFolderTree = async (rootId, userId) => {
  const all = await Folder.find({ userId }).select("_id parentFolder")
  const childrenOf = new Map()
  for (const f of all) {
    const key = String(f.parentFolder)
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key).push(String(f._id))
  }
  const ids = []
  const queue = [String(rootId)]
  while (queue.length) {
    const id = queue.shift()
    ids.push(id)
    for (const child of childrenOf.get(id) || []) queue.push(child)
  }
  return ids
}

//! Rename or move a folder
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.userId })
    if (!folder) return res.status(404).json({ error: "Folder not found" })

    const { name, parentFolder } = req.body

    if (name !== undefined) {
      const trimmed = (name || "").trim()
      if (!trimmed) return res.status(400).json({ error: "Folder name is required" })
      folder.name = trimmed
    }

    if (parentFolder !== undefined) {
      const parent = await resolveOwnedFolder(parentFolder, req.user.userId)
      if (!parent.ok) return res.status(400).json({ error: "Destination folder not found" })
      const destId = parent.folder ? String(parent.folder._id) : null
      // Prevent moving a folder into itself or one of its own descendants
      if (destId) {
        const subtree = await collectFolderTree(folder._id, req.user.userId)
        if (subtree.includes(destId)) {
          return res.status(400).json({ error: "Cannot move a folder into itself" })
        }
      }
      folder.parentFolder = destId
    }

    await folder.save()
    res.json({ folder, message: "Folder updated" })
  } catch (err) {
    console.error("Error updating folder:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Delete a folder and everything inside it (cascade)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.userId })
    if (!folder) return res.status(404).json({ error: "Folder not found" })

    const folderIds = await collectFolderTree(folder._id, req.user.userId)

    // Gather every file contained anywhere in the subtree
    const files = await File.find({ userId: req.user.userId, folderId: { $in: folderIds } })

    let freedBytes = 0
    for (const file of files) {
      freedBytes += file.fileSize || 0
      try {
        if (file.filePath && fs.existsSync(file.filePath)) fs.unlinkSync(file.filePath)
      } catch (unlinkErr) {
        console.error("Error deleting file from storage:", unlinkErr.message)
      }
    }

    const fileIds = files.map((f) => f._id)
    if (fileIds.length) await File.deleteMany({ _id: { $in: fileIds } })
    await Folder.deleteMany({ _id: { $in: folderIds } })

    if (freedBytes > 0) {
      await User.findByIdAndUpdate(req.user.userId, { $inc: { storageUsed: -freedBytes } })
    }

    // Audit + activity logging. AuditLog/ActivityFeed enums have no dedicated
    // "folder" type, so we log under the closest allowed values (file_delete / file).
    await new AuditLog({
      userId: req.user.userId,
      action: "file_delete",
      targetType: "file",
      targetId: folder._id,
      details: { folderName: folder.name, deletedFiles: fileIds.length, deletedFolders: folderIds.length },
      ipAddress: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      status: "success",
    }).save()

    const actingUser = await User.findById(req.user.userId)
    if (actingUser && actingUser.organization) {
      await logActivity({
        organizationId: actingUser.organization,
        userId: actingUser._id,
        type: "file_delete",
        targetType: "file",
        targetId: folder._id,
        targetName: folder.name,
        description: getActivityDescription("file_delete", actingUser.username, `folder "${folder.name}"`),
        metadata: { deletedFiles: fileIds.length },
        priority: "normal",
      })
    }

    res.json({
      message: "Folder deleted",
      deletedFiles: fileIds.length,
      deletedFolders: folderIds.length,
    })
  } catch (err) {
    console.error("Error deleting folder:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
