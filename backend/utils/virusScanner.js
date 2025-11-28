const fs = require("fs")
const path = require("path")
const { exec } = require("child_process")
const File = require("../models/File")
const AuditLog = require("../models/AuditLog")

// Cache for ClamAV availability check (check every 5 minutes)
let clamAvCache = { available: null, lastCheck: 0 }
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Check if ClamAV is available (with caching)
 * @returns {Promise<boolean>}
 */
const isClamAvAvailable = () => {
  return new Promise((resolve) => {
    const now = Date.now()
    if (clamAvCache.available !== null && (now - clamAvCache.lastCheck) < CACHE_DURATION) {
      return resolve(clamAvCache.available)
    }

    exec("which clamscan", (error) => {
      clamAvCache.available = !error
      clamAvCache.lastCheck = now
      resolve(!error)
    })
  })
}

/**
 * Scan a file for viruses using ClamAV
 * @param {string} filePath - Path to the file to scan
 * @returns {Promise<{clean: boolean, result: string, scanTime: number}>}
 */
const scanFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error("File not found"))
    }

    const startTime = Date.now()

    // Use clamscan with no-summary for cleaner output
    exec(`clamscan --no-summary "${filePath}"`, (error, stdout, stderr) => {
      const scanTime = Date.now() - startTime

      if (error) {
        // Exit code 1 means virus found
        if (error.code === 1) {
          const match = stdout.match(/: (.+) FOUND/)
          const threatName = match ? match[1] : "Unknown threat"
          return resolve({ clean: false, result: threatName, scanTime })
        }
        // Other errors
        return reject(new Error(stderr || error.message))
      }
      
      resolve({ clean: true, result: "No threats found", scanTime })
    })
  })
}

/**
 * Alternative: Use ClamAV daemon for faster scanning
 * @param {string} filePath - Path to the file to scan
 * @returns {Promise<{clean: boolean, result: string, scanTime: number}>}
 */
const scanFileWithDaemon = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error("File not found"))
    }

    const startTime = Date.now()

    exec(`clamdscan --no-summary "${filePath}"`, (error, stdout, stderr) => {
      const scanTime = Date.now() - startTime

      if (error) {
        if (error.code === 1) {
          const match = stdout.match(/: (.+) FOUND/)
          const threatName = match ? match[1] : "Unknown threat"
          return resolve({ clean: false, result: threatName, scanTime })
        }
        // Fall back to clamscan if daemon not available
        return scanFile(filePath).then(resolve).catch(reject)
      }
      
      resolve({ clean: true, result: "No threats found", scanTime })
    })
  })
}

/**
 * Real-time scan before download - scans file and returns detailed results
 * @param {string} fileId - MongoDB file ID
 * @param {string} userId - User ID requesting the download
 * @param {string} ipAddress - IP address of the requester
 * @returns {Promise<{allowed: boolean, scanResult: Object, message: string}>}
 */
const scanBeforeDownload = async (fileId, userId = null, ipAddress = null) => {
  try {
    const file = await File.findById(fileId)
    if (!file) {
      return { 
        allowed: false, 
        scanResult: null, 
        message: "File not found" 
      }
    }

    // Check if ClamAV is available
    const clamAvailable = await isClamAvAvailable()
    
    if (!clamAvailable) {
      // If no scanner available, check last scan result
      if (file.scanStatus === "infected") {
        return {
          allowed: false,
          scanResult: {
            status: "infected",
            threat: file.scanResult,
            scanDate: file.scanDate,
            realTimeScan: false,
          },
          message: `File is infected with: ${file.scanResult}`
        }
      }
      
      return {
        allowed: true,
        scanResult: {
          status: file.scanStatus || "unknown",
          message: "Real-time scan unavailable - ClamAV not installed",
          lastScanDate: file.scanDate,
          realTimeScan: false,
        },
        message: "Download allowed (scanner unavailable)"
      }
    }

    // Perform real-time scan
    const startTime = Date.now()
    
    try {
      const result = await scanFileWithDaemon(file.filePath)
      const scanTime = result.scanTime

      // Update file with latest scan results
      await File.findByIdAndUpdate(fileId, {
        scanStatus: result.clean ? "clean" : "infected",
        scanDate: new Date(),
        scanResult: result.result,
      })

      // Log the scan
      await new AuditLog({
        userId: userId,
        action: "file_scan",
        targetType: "file",
        targetId: fileId,
        details: {
          fileName: file.fileName,
          scanType: "real-time-download",
          clean: result.clean,
          result: result.result,
          scanTimeMs: scanTime,
        },
        ipAddress: ipAddress,
        status: result.clean ? "success" : "failure",
      }).save()

      if (!result.clean) {
        return {
          allowed: false,
          scanResult: {
            status: "infected",
            threat: result.result,
            scanDate: new Date(),
            scanTimeMs: scanTime,
            realTimeScan: true,
          },
          message: `⚠️ THREAT DETECTED: ${result.result}`
        }
      }

      return {
        allowed: true,
        scanResult: {
          status: "clean",
          message: "No threats found",
          scanDate: new Date(),
          scanTimeMs: scanTime,
          realTimeScan: true,
        },
        message: `✓ File scanned and verified clean (${scanTime}ms)`
      }

    } catch (scanError) {
      console.error("Real-time scan error:", scanError)
      
      // On scan error, check previous scan status
      if (file.scanStatus === "infected") {
        return {
          allowed: false,
          scanResult: {
            status: "error",
            error: scanError.message,
            lastKnownStatus: "infected",
          },
          message: "Scan failed - file was previously marked as infected"
        }
      }

      // Allow download but warn user
      return {
        allowed: true,
        scanResult: {
          status: "error",
          error: scanError.message,
          lastKnownStatus: file.scanStatus,
          realTimeScan: false,
        },
        message: "Scan error - proceed with caution"
      }
    }

  } catch (error) {
    console.error("Error in scanBeforeDownload:", error)
    return {
      allowed: false,
      scanResult: { status: "error", error: error.message },
      message: "Security check failed"
    }
  }
}

/**
 * Get scan status summary for a file
 * @param {string} fileId - MongoDB file ID
 * @returns {Promise<Object>}
 */
const getScanStatus = async (fileId) => {
  try {
    const file = await File.findById(fileId)
    if (!file) {
      return { error: "File not found" }
    }

    const clamAvailable = await isClamAvAvailable()

    return {
      fileId: file._id,
      fileName: file.fileName,
      scanStatus: file.scanStatus || "pending",
      scanResult: file.scanResult,
      scanDate: file.scanDate,
      scannerAvailable: clamAvailable,
      isClean: file.scanStatus === "clean",
      isInfected: file.scanStatus === "infected",
      needsScan: file.scanStatus === "pending" || !file.scanDate,
    }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * Scan a file and update its status in the database
 * @param {string} fileId - MongoDB file ID
 * @returns {Promise<{success: boolean, scanStatus: string, result: string}>}
 */
const scanAndUpdateFile = async (fileId) => {
  try {
    const file = await File.findById(fileId)
    if (!file) {
      return { success: false, scanStatus: "error", result: "File not found in database" }
    }

    // Check if ClamAV is available
    const clamAvailable = await isClamAvAvailable()
    if (!clamAvailable) {
      console.warn("ClamAV not available, skipping virus scan")
      await File.findByIdAndUpdate(fileId, {
        scanStatus: "clean",
        scanDate: new Date(),
        scanResult: "Scan skipped - ClamAV not available",
      })
      return { 
        success: true, 
        scanStatus: "clean", 
        result: "Scan skipped - ClamAV not available" 
      }
    }

    // Update status to scanning
    await File.findByIdAndUpdate(fileId, { scanStatus: "scanning" })

    // Perform scan
    const scanResult = await scanFileWithDaemon(file.filePath)

    // Update file with scan results
    await File.findByIdAndUpdate(fileId, {
      scanStatus: scanResult.clean ? "clean" : "infected",
      scanDate: new Date(),
      scanResult: scanResult.result,
    })

    // Log scan result
    await new AuditLog({
      userId: file.userId,
      action: "file_scan",
      targetType: "file",
      targetId: fileId,
      details: {
        fileName: file.fileName,
        clean: scanResult.clean,
        result: scanResult.result,
      },
      status: scanResult.clean ? "success" : "failure",
    }).save()

    return {
      success: true,
      scanStatus: scanResult.clean ? "clean" : "infected",
      result: scanResult.result,
    }
  } catch (error) {
    console.error("Error scanning file:", error)
    
    await File.findByIdAndUpdate(fileId, {
      scanStatus: "error",
      scanDate: new Date(),
      scanResult: error.message,
    })

    return { success: false, scanStatus: "error", result: error.message }
  }
}

/**
 * Scan all pending files
 * @returns {Promise<{total: number, clean: number, infected: number, errors: number}>}
 */
const scanPendingFiles = async () => {
  try {
    const pendingFiles = await File.find({ scanStatus: "pending" })
    let clean = 0
    let infected = 0
    let errors = 0

    for (const file of pendingFiles) {
      const result = await scanAndUpdateFile(file._id)
      if (result.scanStatus === "clean") clean++
      else if (result.scanStatus === "infected") infected++
      else errors++
    }

    return {
      total: pendingFiles.length,
      clean,
      infected,
      errors,
    }
  } catch (error) {
    console.error("Error scanning pending files:", error)
    throw error
  }
}

/**
 * Quarantine an infected file
 * @param {string} fileId - MongoDB file ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
const quarantineFile = async (fileId) => {
  try {
    const file = await File.findById(fileId)
    if (!file) {
      return { success: false, message: "File not found" }
    }

    const quarantineDir = path.join(__dirname, "../quarantine")
    if (!fs.existsSync(quarantineDir)) {
      fs.mkdirSync(quarantineDir, { recursive: true })
    }

    const quarantinePath = path.join(quarantineDir, path.basename(file.filePath))
    
    // Move file to quarantine
    fs.renameSync(file.filePath, quarantinePath)

    // Update file record
    await File.findByIdAndUpdate(fileId, {
      filePath: quarantinePath,
      isRevoked: true,
      revokedAt: new Date(),
      revokeReason: "Quarantined due to virus detection",
    })

    return { success: true, message: "File quarantined successfully" }
  } catch (error) {
    console.error("Error quarantining file:", error)
    return { success: false, message: error.message }
  }
}

module.exports = {
  isClamAvAvailable,
  scanFile,
  scanFileWithDaemon,
  scanAndUpdateFile,
  scanPendingFiles,
  quarantineFile,
  scanBeforeDownload,
  getScanStatus,
}
