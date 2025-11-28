const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  action: {
    type: String,
    required: true,
    enum: [
      "user_login",
      "user_logout",
      "user_register",
      "user_update",
      "user_delete",
      "user_deactivate",
      "user_activate",
      "file_upload",
      "file_download",
      "file_delete",
      "file_share",
      "file_revoke",
      "file_access",
      "file_scan",
      "file_integrity_check",
      "admin_action",
      "system_cleanup",
    ],
  },
  targetType: {
    type: String,
    enum: ["user", "file", "system"],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ["success", "failure", "pending"],
    default: "success",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

// Index for efficient querying
auditLogSchema.index({ timestamp: -1 })
auditLogSchema.index({ userId: 1, timestamp: -1 })
auditLogSchema.index({ action: 1, timestamp: -1 })
auditLogSchema.index({ targetType: 1, targetId: 1 })

module.exports = mongoose.model("AuditLog", auditLogSchema)
