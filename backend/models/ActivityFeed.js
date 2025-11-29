const mongoose = require("mongoose")

const activityFeedSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Activity type
  type: {
    type: String,
    enum: [
      "login",
      "logout",
      "file_upload",
      "file_download",
      "file_share",
      "file_delete",
      "file_view",
      "file_revoke",
      "file_expire",
      "profile_update",
      "password_change",
      "member_join",
      "member_leave",
      "role_change",
      "settings_change",
      "comment",
      "other"
    ],
    required: true,
  },
  // What was affected
  target: {
    type: {
      type: String,
      enum: ["file", "user", "organization", "settings", "system"],
      default: "system",
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      default: null,
    },
  },
  // Human-readable description
  description: {
    type: String,
    required: true,
  },
  // Additional metadata
  metadata: {
    fileSize: Number,
    fileType: String,
    sharedWith: String,
    shareType: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    device: String,
  },
  // Priority/importance
  priority: {
    type: String,
    enum: ["low", "normal", "high", "critical"],
    default: "normal",
  },
  // Read status for notifications
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date, default: Date.now },
  }],
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
})

// Indexes for efficient querying
activityFeedSchema.index({ organization: 1, timestamp: -1 })
activityFeedSchema.index({ organization: 1, type: 1, timestamp: -1 })
activityFeedSchema.index({ userId: 1, timestamp: -1 })
activityFeedSchema.index({ "target.type": 1, "target.id": 1 })

// TTL index - auto delete after 90 days
activityFeedSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

// Static method to get recent activity for an organization
activityFeedSchema.statics.getRecentActivity = function(organizationId, limit = 50, skip = 0) {
  return this.find({ organization: organizationId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate("userId", "username email role avatar")
}

// Static method to get activity by type
activityFeedSchema.statics.getActivityByType = function(organizationId, type, limit = 20) {
  return this.find({ organization: organizationId, type })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("userId", "username email role avatar")
}

// Static method to get user's activity
activityFeedSchema.statics.getUserActivity = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
}

// Static method to get activity stats for a time period
activityFeedSchema.statics.getActivityStats = async function(organizationId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ])
}

module.exports = mongoose.model("ActivityFeed", activityFeedSchema)
