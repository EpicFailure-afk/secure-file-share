const AuditLog = require("../models/AuditLog")
const User = require("../models/User")
const { sendEmail } = require("./email")
const logger = require("./logger")
const metrics = require("./metrics")

// Central security-alert sink (Operation Red Zone Phase 6).
//
// One place to "raise the alarm" so every detection (honey-file access today,
// risk-engine triggers in Phase 7 tomorrow) is recorded, surfaced live, and —
// for high-severity events — emailed to admins, consistently. Each alert:
//   1. is written to the tamper-evident AuditLog (durable, provable record),
//   2. is pushed to the real-time security dashboard over WebSocket, and
//   3. for high/critical severity, is emailed to all active admins.
// Failures in any channel are swallowed (logged) so alerting never breaks the
// request that triggered it.

// Best-effort real-time push. Lazy-required so this module has no hard load-time
// dependency on the realtime layer (and no circular import).
function emitRealtime(event) {
  try {
    const realtime = require("./realtime")
    realtime.emitSecurityEvent(event)
  } catch {
    // realtime not initialized / not available — non-fatal
  }
}

async function emailAdmins(subject, body) {
  try {
    const admins = await User.find({
      role: "superadmin",
      isActive: true,
    })
      .select("email")
      .lean()
    await Promise.allSettled(
      admins
        .filter((a) => a.email)
        .map((a) => sendEmail(a.email, subject, body, `<pre>${body}</pre>`)),
    )
  } catch (err) {
    logger.error("security_alert_email_failed", { errorMessage: err.message })
  }
}

/**
 * Raise a security alert across all channels.
 * @param {object} alert
 * @param {string} alert.type        machine type, e.g. "honey_file_access"
 * @param {string} alert.severity    "low" | "normal" | "high" | "critical"
 * @param {string} alert.message     human-readable description
 * @param {string} [alert.action]    AuditLog action enum (default "admin_action")
 * @param {string} [alert.userId]
 * @param {string} [alert.targetType] AuditLog targetType (default "system")
 * @param {string} [alert.targetId]
 * @param {string} [alert.ip]
 * @param {string} [alert.userAgent]
 * @param {object} [alert.details]
 */
async function raiseSecurityAlert(alert) {
  const {
    type,
    severity = "high",
    message,
    action = "admin_action",
    userId = null,
    targetType = "system",
    targetId = null,
    ip = null,
    userAgent = null,
    details = {},
  } = alert

  const enriched = { ...details, securityAlert: true, alertType: type, severity, message }

  // 1. Durable, tamper-evident record
  try {
    await new AuditLog({
      userId,
      action,
      targetType,
      targetId,
      details: enriched,
      ipAddress: ip,
      userAgent,
      status: "success",
    }).save()
  } catch (err) {
    logger.error("security_alert_audit_failed", { errorMessage: err.message, type })
  }

  // 2. Structured log (always) + metric
  logger.warn("security_alert", { type, severity, message, userId, targetId, ip })
  metrics.inc("security_alerts_total")

  // 3. Live dashboard
  emitRealtime({
    kind: "security_alert",
    type,
    severity,
    message,
    userId,
    targetId,
    ip,
    timestamp: new Date().toISOString(),
  })

  // 4. Email admins for the loud ones
  if (severity === "high" || severity === "critical") {
    await emailAdmins(
      `[Security Alert] ${type}`,
      `${message}\n\nSeverity: ${severity}\nUser: ${userId || "n/a"}\nTarget: ${targetId || "n/a"}\nIP: ${ip || "n/a"}\nTime: ${new Date().toISOString()}`,
    )
  }
}

/**
 * Honey-file access detector. A honey file is a decoy planted to catch
 * intruders — its whole value is the loud alert it raises on ANY access. We log
 * + alert but still serve the file so the intruder never learns it was a trap.
 */
async function honeyFileAccessed({ file, userId, ip, userAgent, via }) {
  await raiseSecurityAlert({
    type: "honey_file_access",
    severity: "critical",
    action: "file_access",
    message: `Honey file "${file.fileName}" was accessed via ${via} — possible intrusion`,
    userId,
    targetType: "file",
    targetId: file._id,
    ip,
    userAgent,
    details: { fileName: file.fileName, honeyFile: true, via },
  })
}

module.exports = { raiseSecurityAlert, honeyFileAccessed }
