const express = require("express")
const fs = require("fs")
const authMiddleware = require("../middleware/auth")
const User = require("../models/User")
const File = require("../models/File")
const AuditLog = require("../models/AuditLog")
const SystemSettings = require("../models/SystemSettings")
const { verifyFileIntegrity, runSystemIntegrityCheck } = require("../utils/fileIntegrity")
const { scanAndUpdateFile, scanPendingFiles, quarantineFile, isClamAvAvailable } = require("../utils/virusScanner")
const { revokeFile, restoreFile, cleanupExpiredFiles, getFilesExpiringSoon, setFileExpiration } = require("../utils/fileExpiration")

const router = express.Router()

// Admin middleware - allows superadmin role for system-wide admin
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." })
    }
    req.adminUser = user
    next()
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
}

// Apply auth and admin middleware to all routes
router.use(authMiddleware)
router.use(adminMiddleware)

// ============== DASHBOARD STATS ==============

// Get dashboard overview stats
router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalFiles,
      infectedFiles,
      pendingScanFiles,
      revokedFiles,
      totalStorage,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      File.countDocuments(),
      File.countDocuments({ scanStatus: "infected" }),
      File.countDocuments({ scanStatus: "pending" }),
      File.countDocuments({ isRevoked: true }),
      File.aggregate([{ $group: { _id: null, total: { $sum: "$fileSize" } } }]),
    ])

    const recentActivity = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("userId", "username email")

    const filesExpiringSoon = await getFilesExpiringSoon(7)
    const clamAvAvailable = await isClamAvAvailable()

    res.json({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        files: {
          total: totalFiles,
          infected: infectedFiles,
          pendingScan: pendingScanFiles,
          revoked: revokedFiles,
          expiringSoon: filesExpiringSoon.length,
        },
        storage: {
          totalUsed: totalStorage[0]?.total || 0,
        },
        system: {
          clamAvAvailable,
        },
      },
      recentActivity,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// ============== USER MANAGEMENT ==============

// Get all users with pagination
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ""
    const skip = (page - 1) * limit

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ])

    // Get file counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const fileCount = await File.countDocuments({ userId: user._id })
        return {
          ...user.toObject(),
          fileCount,
        }
      })
    )

    res.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get single user details
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    const files = await File.find({ userId: user._id }).sort({ uploadDate: -1 })
    const recentActivity = await AuditLog.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(20)

    res.json({ user, files, recentActivity })
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Update user role
router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" })
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await new AuditLog({
      userId: req.user.userId,
      action: "admin_action",
      targetType: "user",
      targetId: req.params.id,
      details: { action: "role_change", newRole: role },
      status: "success",
    }).save()

    res.json({ user, message: "User role updated successfully" })
  } catch (error) {
    console.error("Error updating user role:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Deactivate user
router.put("/users/:id/deactivate", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await new AuditLog({
      userId: req.user.userId,
      action: "user_deactivate",
      targetType: "user",
      targetId: req.params.id,
      status: "success",
    }).save()

    res.json({ user, message: "User deactivated successfully" })
  } catch (error) {
    console.error("Error deactivating user:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Activate user
router.put("/users/:id/activate", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await new AuditLog({
      userId: req.user.userId,
      action: "user_activate",
      targetType: "user",
      targetId: req.params.id,
      status: "success",
    }).save()

    res.json({ user, message: "User activated successfully" })
  } catch (error) {
    console.error("Error activating user:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Update user storage limit
router.put("/users/:id/storage-limit", async (req, res) => {
  try {
    const { storageLimit } = req.body // in bytes
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { storageLimit },
      { new: true }
    ).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ user, message: "Storage limit updated successfully" })
  } catch (error) {
    console.error("Error updating storage limit:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete user and all their files
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Delete all user files
    const userFiles = await File.find({ userId: req.params.id })
    for (const file of userFiles) {
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath)
      }
    }
    await File.deleteMany({ userId: req.params.id })

    // Delete user
    await User.findByIdAndDelete(req.params.id)

    await new AuditLog({
      userId: req.user.userId,
      action: "user_delete",
      targetType: "user",
      targetId: req.params.id,
      details: { deletedUser: user.email, filesDeleted: userFiles.length },
      status: "success",
    }).save()

    res.json({ message: "User and all files deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// ============== FILE MANAGEMENT ==============

// Get all files with filters
router.get("/files", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const { scanStatus, isRevoked, search } = req.query

    const query = {}
    if (scanStatus) query.scanStatus = scanStatus
    if (isRevoked !== undefined) query.isRevoked = isRevoked === "true"
    if (search) {
      query.fileName = { $regex: search, $options: "i" }
    }

    const [files, total] = await Promise.all([
      File.find(query)
        .populate("userId", "username email")
        .sort({ uploadDate: -1 })
        .skip(skip)
        .limit(limit),
      File.countDocuments(query),
    ])

    res.json({
      files,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching files:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get file details
router.get("/files/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
      .populate("userId", "username email")
      .populate("revokedBy", "username email")

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    res.json({ file })
  } catch (error) {
    console.error("Error fetching file:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Revoke file
router.post("/files/:id/revoke", async (req, res) => {
  try {
    const { reason } = req.body
    const result = await revokeFile(req.params.id, req.user.userId, reason)
    
    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ message: result.message })
  } catch (error) {
    console.error("Error revoking file:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Restore revoked file
router.post("/files/:id/restore", async (req, res) => {
  try {
    const result = await restoreFile(req.params.id, req.user.userId)
    
    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ message: result.message })
  } catch (error) {
    console.error("Error restoring file:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Set file expiration
router.post("/files/:id/expiration", async (req, res) => {
  try {
    const { expiresAt } = req.body
    const result = await setFileExpiration(req.params.id, expiresAt)
    
    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ message: result.message, expiresAt: result.expiresAt })
  } catch (error) {
    console.error("Error setting expiration:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete file
router.delete("/files/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    // Delete from disk
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath)
    }

    // Update user storage
    await User.findByIdAndUpdate(file.userId, {
      $inc: { storageUsed: -file.fileSize },
    })

    await File.findByIdAndDelete(req.params.id)

    await new AuditLog({
      userId: req.user.userId,
      action: "file_delete",
      targetType: "file",
      targetId: req.params.id,
      details: { fileName: file.fileName, adminDelete: true },
      status: "success",
    }).save()

    res.json({ message: "File deleted successfully" })
  } catch (error) {
    console.error("Error deleting file:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// ============== FILE INTEGRITY ==============

// Verify single file integrity
router.post("/files/:id/verify-integrity", async (req, res) => {
  try {
    const result = await verifyFileIntegrity(req.params.id)
    res.json(result)
  } catch (error) {
    console.error("Error verifying file integrity:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Run system-wide integrity check
router.post("/integrity-check", async (req, res) => {
  try {
    const result = await runSystemIntegrityCheck()
    res.json(result)
  } catch (error) {
    console.error("Error running integrity check:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// ============== VIRUS SCANNING ==============

// Check ClamAV status
router.get("/scan/status", async (req, res) => {
  try {
    const available = await isClamAvAvailable()
    const pendingCount = await File.countDocuments({ scanStatus: "pending" })
    const infectedCount = await File.countDocuments({ scanStatus: "infected" })

    res.json({
      clamAvAvailable: available,
      pendingScans: pendingCount,
      infectedFiles: infectedCount,
    })
  } catch (error) {
    console.error("Error checking scan status:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Scan single file
router.post("/files/:id/scan", async (req, res) => {
  try {
    const result = await scanAndUpdateFile(req.params.id)
    res.json(result)
  } catch (error) {
    console.error("Error scanning file:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Scan all pending files
router.post("/scan/pending", async (req, res) => {
  try {
    const result = await scanPendingFiles()
    res.json(result)
  } catch (error) {
    console.error("Error scanning pending files:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Quarantine infected file
router.post("/files/:id/quarantine", async (req, res) => {
  try {
    const result = await quarantineFile(req.params.id)
    
    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ message: result.message })
  } catch (error) {
    console.error("Error quarantining file:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// ============== CLEANUP & MAINTENANCE ==============

// Cleanup expired files
router.post("/cleanup/expired", async (req, res) => {
  try {
    const { deleteFromDisk = true } = req.body
    const result = await cleanupExpiredFiles(deleteFromDisk)
    
    await new AuditLog({
      userId: req.user.userId,
      action: "system_cleanup",
      targetType: "system",
      details: result,
      status: "success",
    }).save()

    res.json(result)
  } catch (error) {
    console.error("Error cleaning up expired files:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Get files expiring soon
router.get("/files/expiring-soon", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const files = await getFilesExpiringSoon(days)
    res.json({ files })
  } catch (error) {
    console.error("Error getting expiring files:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// ============== AUDIT LOGS ==============

// Get audit logs
router.get("/audit-logs", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const skip = (page - 1) * limit
    const { action, userId, targetType } = req.query

    const query = {}
    if (action) query.action = action
    if (userId) query.userId = userId
    if (targetType) query.targetType = targetType

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("userId", "username email")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
    ])

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// ============== SYSTEM SETTINGS ==============

// Get all settings
router.get("/settings", async (req, res) => {
  try {
    await SystemSettings.initializeDefaults()
    const settings = await SystemSettings.find()
    res.json({ settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Update setting
router.put("/settings/:key", async (req, res) => {
  try {
    const { value } = req.body
    const setting = await SystemSettings.updateSetting(
      req.params.key,
      value,
      req.user.userId
    )

    if (!setting) {
      return res.status(404).json({ error: "Setting not found" })
    }

    await new AuditLog({
      userId: req.user.userId,
      action: "admin_action",
      targetType: "system",
      details: { setting: req.params.key, newValue: value },
      status: "success",
    }).save()

    res.json({ setting, message: "Setting updated successfully" })
  } catch (error) {
    console.error("Error updating setting:", error)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
