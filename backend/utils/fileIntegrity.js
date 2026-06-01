const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const File = require("../models/File")
const AuditLog = require("../models/AuditLog")

// The directory where encrypted files actually live. Resolved the same way the
// upload route resolves it (relative to the backend source tree), so it stays
// correct regardless of the absolute base path of the deployment/container.
const UPLOADS_DIR = path.join(__dirname, "../uploads")

/**
 * Resolve the on-disk location of a stored file at CHECK time.
 *
 * The DB stores an absolute path captured at upload time. If that exact path no
 * longer exists (e.g. the deployment's base path changed, or the file was looked
 * up via a stale absolute reference) we fall back to locating the same file by
 * name inside the current uploads directory. Returns the resolved path, or null
 * if the file genuinely cannot be found anywhere.
 * @param {string} storedPath
 * @returns {string|null}
 */
const resolveExistingPath = (storedPath) => {
  if (storedPath && fs.existsSync(storedPath)) return storedPath
  if (storedPath) {
    const candidate = path.join(UPLOADS_DIR, path.basename(storedPath))
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Calculate SHA-256 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Hex-encoded hash
 */
const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256")
    const stream = fs.createReadStream(filePath)

    stream.on("data", (data) => hash.update(data))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", (err) => reject(err))
  })
}

/**
 * Verify file integrity by comparing stored hash with current hash
 * @param {string} fileId - MongoDB file ID
 * @returns {Promise<{verified: boolean, message: string}>}
 */
const verifyFileIntegrity = async (fileId) => {
  try {
    const file = await File.findById(fileId)
    if (!file) {
      return { verified: false, message: "File not found" }
    }

    if (!file.fileHash) {
      return { verified: false, message: "No hash stored for this file" }
    }

    // Resolve the file's current location at check time (with a by-name fallback
    // for stale absolute paths) instead of trusting only the path baked in at
    // upload time.
    const resolvedPath = resolveExistingPath(file.filePath)
    if (!resolvedPath) {
      await File.findByIdAndUpdate(fileId, {
        integrityVerified: false,
        lastIntegrityCheck: new Date(),
      })
      return { verified: false, message: "File not found on disk" }
    }

    // Self-heal a drifted path so future checks (and downloads) find the file.
    if (resolvedPath !== file.filePath) {
      await File.findByIdAndUpdate(fileId, { filePath: resolvedPath })
    }

    const currentHash = await calculateFileHash(resolvedPath)
    const isVerified = currentHash === file.fileHash

    await File.findByIdAndUpdate(fileId, {
      integrityVerified: isVerified,
      lastIntegrityCheck: new Date(),
    })

    // Log integrity check
    await new AuditLog({
      action: "file_integrity_check",
      targetType: "file",
      targetId: fileId,
      details: {
        verified: isVerified,
        storedHash: file.fileHash,
        currentHash: currentHash,
      },
      status: isVerified ? "success" : "failure",
    }).save()

    return {
      verified: isVerified,
      message: isVerified ? "File integrity verified" : "File integrity check failed - file may have been tampered with",
      storedHash: file.fileHash,
      currentHash: currentHash,
    }
  } catch (error) {
    console.error("Error verifying file integrity:", error)
    return { verified: false, message: error.message }
  }
}

/**
 * Verify integrity of all files for a user
 * @param {string} userId - MongoDB user ID
 * @returns {Promise<Array>}
 */
const verifyAllUserFiles = async (userId) => {
  try {
    const files = await File.find({ userId, isRevoked: false })
    const results = []

    for (const file of files) {
      const result = await verifyFileIntegrity(file._id)
      results.push({
        fileId: file._id,
        fileName: file.fileName,
        ...result,
      })
    }

    return results
  } catch (error) {
    console.error("Error verifying user files:", error)
    throw error
  }
}

/**
 * Run system-wide integrity check
 * @returns {Promise<{total: number, verified: number, failed: number, results: Array}>}
 */
const runSystemIntegrityCheck = async () => {
  try {
    const files = await File.find({ isRevoked: false })
    const results = []
    let verified = 0
    let failed = 0

    for (const file of files) {
      const result = await verifyFileIntegrity(file._id)
      results.push({
        fileId: file._id,
        fileName: file.fileName,
        userId: file.userId,
        ...result,
      })

      if (result.verified) {
        verified++
      } else {
        failed++
      }
    }

    // Log system integrity check
    await new AuditLog({
      action: "file_integrity_check",
      targetType: "system",
      details: {
        totalFiles: files.length,
        verified,
        failed,
      },
      status: failed === 0 ? "success" : "failure",
    }).save()

    return {
      total: files.length,
      verified,
      failed,
      results,
    }
  } catch (error) {
    console.error("Error running system integrity check:", error)
    throw error
  }
}

module.exports = {
  calculateFileHash,
  verifyFileIntegrity,
  verifyAllUserFiles,
  runSystemIntegrityCheck,
}
