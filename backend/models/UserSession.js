const mongoose = require("mongoose")

const userSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null,
  },
  // Session tracking
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["online", "idle", "offline"],
    default: "online",
  },
  // Login/logout times
  loginTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  logoutTime: {
    type: Date,
    default: null,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  // Device info
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  device: {
    type: String,
    default: "Unknown",
  },
  browser: {
    type: String,
    default: "Unknown",
  },
  os: {
    type: String,
    default: "Unknown",
  },
  // Location (optional, from IP)
  location: {
    country: { type: String, default: null },
    city: { type: String, default: null },
  },
  // Work hours tracking
  totalActiveTime: {
    type: Number, // in seconds
    default: 0,
  },
  idleTime: {
    type: Number, // in seconds
    default: 0,
  },
  // Activity breakdown
  activityBreakdown: {
    uploads: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    deletes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
}, { timestamps: true })

// Index for efficient querying
userSessionSchema.index({ organization: 1, status: 1 })
userSessionSchema.index({ userId: 1, loginTime: -1 })
userSessionSchema.index({ organization: 1, loginTime: -1 })
userSessionSchema.index({ status: 1, lastActivity: -1 })

// Method to calculate session duration
userSessionSchema.methods.getDuration = function() {
  const endTime = this.logoutTime || new Date()
  return Math.floor((endTime - this.loginTime) / 1000) // in seconds
}

// Method to format duration
userSessionSchema.methods.getFormattedDuration = function() {
  const seconds = this.getDuration()
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}h ${minutes}m ${secs}s`
}

// Static method to get active sessions for an organization
userSessionSchema.statics.getActiveSessions = function(organizationId) {
  return this.find({
    organization: organizationId,
    status: { $in: ["online", "idle"] },
    logoutTime: null,
  }).populate("userId", "username email role jobTitle department avatar")
}

// Static method to get today's sessions for an organization
userSessionSchema.statics.getTodaySessions = function(organizationId) {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  
  return this.find({
    organization: organizationId,
    loginTime: { $gte: startOfDay },
  }).populate("userId", "username email role jobTitle department avatar")
}

module.exports = mongoose.model("UserSession", userSessionSchema)
