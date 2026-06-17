const UserSession = require("../models/UserSession")
const ActivityFeed = require("../models/ActivityFeed")
const logger = require("./logger")

// Data retention policy (Operation Red Zone Phase 6).
//
// Formalizes how long operational records are kept, building on the primitives
// already in the data model:
//
//   • Files  — expiry handled by File.expiresAt + the hourly cleanupExpiredFiles
//              job and a Mongo TTL index (see utils/fileExpiration.js / File.js).
//   • Activity feed — auto-expired by a 90-day TTL index on ActivityFeed.
//   • Sessions — closed-out (offline) UserSession rows pile up forever; this job
//                prunes them past the retention window, and force-closes stale
//                still-"online" sessions that were never cleanly logged out.
//
// Audit logs are deliberately NOT pruned here: they form a tamper-evident hash
// chain (AuditLog) and deleting any entry would break the chain by design. Audit
// retention, if ever required, must be an explicit, logged archival operation —
// not silent TTL deletion.

const SESSION_RETENTION_DAYS = parseInt(process.env.SESSION_RETENTION_DAYS, 10) || 30

// Run one retention pass. Safe to call repeatedly; returns a summary.
const runRetention = async () => {
  const summary = { staleSessionsClosed: 0, oldSessionsDeleted: 0 }

  try {
    // 1. Force-close sessions that have gone quiet but were never logged out, so
    //    they become eligible for deletion below and stop skewing online counts.
    summary.staleSessionsClosed = await UserSession.cleanupStaleSessions()

    // 2. Delete sessions that have been closed (offline + logged out) longer than
    //    the retention window. Keeps recent history for the dashboard while
    //    bounding unbounded growth.
    const cutoff = new Date(Date.now() - SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const result = await UserSession.deleteMany({
      status: "offline",
      logoutTime: { $ne: null, $lt: cutoff },
    })
    summary.oldSessionsDeleted = result.deletedCount || 0

    if (summary.staleSessionsClosed > 0 || summary.oldSessionsDeleted > 0) {
      logger.info("retention_pass", {
        ...summary,
        sessionRetentionDays: SESSION_RETENTION_DAYS,
      })
    }
  } catch (err) {
    logger.error("retention_error", { errorMessage: err.message })
  }

  return summary
}

// Expose the configured windows so the admin dashboard can display the active
// retention policy honestly (ActivityFeed window is fixed by its TTL index).
const getRetentionPolicy = () => ({
  sessionRetentionDays: SESSION_RETENTION_DAYS,
  activityFeedRetentionDays: 90,
  auditLogs: "retained indefinitely (tamper-evident chain)",
})

module.exports = { runRetention, getRetentionPolicy }
