const fs = require("fs")
const File = require("../models/File")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")

/**
 * Calculate expiration date based on value and unit
 * @param {number} value - Expiration value
 * @param {string} unit - Time unit: 'seconds', 'minutes', 'hours', 'days'
 * @returns {Date} - Expiration date
 */
const calculateExpirationDate = (value, unit = "days") => {
  const now = new Date()
  let milliseconds

  switch (unit.toLowerCase()) {
    case "seconds":
    case "second":
    case "s":
      milliseconds = value * 1000
      break
    case "minutes":
    case "minute":
    case "m":
      milliseconds = value * 60 * 1000
      break
    case "hours":
    case "hour":
    case "h":
      milliseconds = value * 60 * 60 * 1000
      break
    case "days":
    case "day":
    case "d":
    default:
      milliseconds = value * 24 * 60 * 60 * 1000
      break
  }

  return new Date(now.getTime() + milliseconds)
}

/**
 * Format remaining time in human-readable format
 * @param {Date} expiresAt - Expiration date
 * @returns {string} - Human-readable remaining time
 */
const formatRemainingTime = (expiresAt) => {
  if (!expiresAt) return null

  const now = new Date()
  const expiry = new Date(expiresAt)
  const diffMs = expiry - now

  if (diffMs <= 0) return "Expired"

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    const remainingHours = diffHours % 24
    return `${diffDays}d ${remainingHours}h`
  } else if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60
    return `${diffHours}h ${remainingMinutes}m`
  } else if (diffMinutes > 0) {
    const remainingSeconds = diffSeconds % 60
    return `${diffMinutes}m ${remainingSeconds}s`
  } else {
    return `${diffSeconds}s`
  }
}

/**
 * Set expiration date for a file with flexible time units
 * @param {string} fileId - MongoDB file ID
 * @param {number} value - Expiration value
 * @param {string} unit - Time unit: 'seconds', 'minutes', 'hours', 'days'
 * @returns {Promise<{success: boolean, message: string, expiresAt: Date, remaining: string}>}
 */
const setFileExpiration = async (fileId, value, unit = "days") => {
  try {
    const file = await File.findById(fileId)
    if (!file) {
      return { success: false, message: "File not found" }
    }

    if (!value || value <= 0) {
      // Remove expiration
      await File.findByIdAndUpdate(fileId, { expiresAt: null })
      return { success: true, message: "Expiration removed", expiresAt: null }
    }

    const expiresAt = calculateExpirationDate(value, unit)
    const remaining = formatRemainingTime(expiresAt)

    await File.findByIdAndUpdate(fileId, { expiresAt })

    return { 
      success: true, 
      message: `File will expire in ${remaining}`, 
      expiresAt,
      remaining 
    }
  } catch (error) {
    console.error("Error setting file expiration:", error)
    return { success: false, message: error.message }
  }
}

/**
 * Remove expiration from a file
 * @param {string} fileId - MongoDB file ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
const removeFileExpiration = async (fileId) => {
  try {
    await File.findByIdAndUpdate(fileId, { expiresAt: null })
    return { success: true, message: "Expiration removed successfully" }
  } catch (error) {
    console.error("Error removing file expiration:", error)
    return { success: false, message: error.message }
  }
}

/**
 * Revoke a file (make it inaccessible)
 * @param {string} fileId - MongoDB file ID
 * @param {string} userId - User ID who is revoking
 * @param {string} reason - Reason for revocation
 * @returns {Promise<{success: boolean, message: string}>}
 */
const revokeFile = async (fileId, userId, reason = "Revoked by owner") => {
  try {
    const file = await File.findById(fileId)
    if (!file) {
      return { success: false, message: "File not found" }
    }

    await File.findByIdAndUpdate(fileId, {
      isRevoked: true,
      revokedAt: new Date(),
      revokedBy: userId,
      revokeReason: reason,
      shareToken: null, // Invalidate share token
      shareExpiry: null,
    })

    // Log revocation
    await new AuditLog({
      userId,
      action: "file_revoke",
      targetType: "file",
      targetId: fileId,
      details: {
        fileName: file.fileName,
        reason,
      },
      status: "success",
    }).save()

    return { success: true, message: "File revoked successfully" }
  } catch (error) {
    console.error("Error revoking file:", error)
    return { success: false, message: error.message }
  }
}

/**
 * Restore a revoked file
 * @param {string} fileId - MongoDB file ID
 * @param {string} userId - User ID who is restoring
 * @returns {Promise<{success: boolean, message: string}>}
 */
const restoreFile = async (fileId, userId) => {
  try {
    const file = await File.findById(fileId)
    if (!file) {
      return { success: false, message: "File not found" }
    }

    if (!file.isRevoked) {
      return { success: false, message: "File is not revoked" }
    }

    // Check if file still exists on disk
    if (!fs.existsSync(file.filePath)) {
      return { success: false, message: "File no longer exists on disk" }
    }

    await File.findByIdAndUpdate(fileId, {
      isRevoked: false,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
    })

    return { success: true, message: "File restored successfully" }
  } catch (error) {
    console.error("Error restoring file:", error)
    return { success: false, message: error.message }
  }
}

/**
 * Get all expired files
 * @returns {Promise<Array>}
 */
const getExpiredFiles = async () => {
  try {
    return await File.find({
      expiresAt: { $lt: new Date() },
      isRevoked: false,
    }).populate("userId", "username email")
  } catch (error) {
    console.error("Error getting expired files:", error)
    throw error
  }
}

/**
 * Clean up expired files (delete from disk and database)
 * @param {boolean} deleteFromDisk - Whether to delete files from disk
 * @returns {Promise<{deleted: number, errors: number}>}
 */
const cleanupExpiredFiles = async (deleteFromDisk = true) => {
  try {
    const expiredFiles = await getExpiredFiles()
    let deleted = 0
    let errors = 0

    for (const file of expiredFiles) {
      try {
        if (deleteFromDisk && fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath)
        }

        // Update user storage
        await User.findByIdAndUpdate(file.userId, {
          $inc: { storageUsed: -file.fileSize },
        })

        await File.findByIdAndDelete(file._id)
        deleted++

        // Log cleanup
        await new AuditLog({
          action: "system_cleanup",
          targetType: "file",
          targetId: file._id,
          details: {
            fileName: file.fileName,
            reason: "File expired",
          },
          status: "success",
        }).save()
      } catch (err) {
        console.error(`Error deleting expired file ${file._id}:`, err)
        errors++
      }
    }

    return { deleted, errors }
  } catch (error) {
    console.error("Error cleaning up expired files:", error)
    throw error
  }
}

/**
 * Get files expiring soon
 * @param {number} days - Number of days to look ahead
 * @returns {Promise<Array>}
 */
const getFilesExpiringSoon = async (days = 7) => {
  try {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    return await File.find({
      expiresAt: { $gt: new Date(), $lt: futureDate },
      isRevoked: false,
    }).populate("userId", "username email")
  } catch (error) {
    console.error("Error getting files expiring soon:", error)
    throw error
  }
}

/**
 * Set download limit for a file
 * @param {string} fileId - MongoDB file ID
 * @param {number} maxDownloads - Maximum number of downloads allowed
 * @returns {Promise<{success: boolean, message: string}>}
 */
const setDownloadLimit = async (fileId, maxDownloads) => {
  try {
    await File.findByIdAndUpdate(fileId, { maxDownloads })
    return { success: true, message: "Download limit set successfully" }
  } catch (error) {
    console.error("Error setting download limit:", error)
    return { success: false, message: error.message }
  }
}

module.exports = {
  calculateExpirationDate,
  formatRemainingTime,
  setFileExpiration,
  removeFileExpiration,
  revokeFile,
  restoreFile,
  getExpiredFiles,
  cleanupExpiredFiles,
  getFilesExpiringSoon,
  setDownloadLimit,
}
