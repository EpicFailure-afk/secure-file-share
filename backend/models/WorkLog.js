const mongoose = require("mongoose")

const workLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  // Date for this work log (normalized to start of day)
  date: {
    type: Date,
    required: true,
  },
  // Total time logged in (in seconds)
  totalLoginTime: {
    type: Number,
    default: 0,
  },
  // Active time (not idle)
  activeTime: {
    type: Number,
    default: 0,
  },
  // Idle time
  idleTime: {
    type: Number,
    default: 0,
  },
  // First login of the day
  firstLogin: {
    type: Date,
    default: null,
  },
  // Last logout of the day
  lastLogout: {
    type: Date,
    default: null,
  },
  // Number of sessions
  sessionCount: {
    type: Number,
    default: 0,
  },
  // Activity counts
  activities: {
    uploads: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    deletes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
  },
  // Files worked on
  filesWorkedOn: [{
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    fileName: String,
    actions: [String],
  }],
  // Hourly breakdown (24 hours)
  hourlyBreakdown: [{
    hour: { type: Number, min: 0, max: 23 },
    activeMinutes: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
  }],
}, { timestamps: true })

// Compound index for user + date
workLogSchema.index({ userId: 1, date: 1 }, { unique: true })
workLogSchema.index({ organization: 1, date: -1 })
workLogSchema.index({ organization: 1, userId: 1, date: -1 })

// Get formatted work hours
workLogSchema.methods.getFormattedTime = function(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

// Static method to get or create today's work log
workLogSchema.statics.getOrCreateToday = async function(userId, organizationId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let workLog = await this.findOne({ userId, date: today })
  
  if (!workLog) {
    workLog = await this.create({
      userId,
      organization: organizationId,
      date: today,
    })
  }
  
  return workLog
}

// Static method to get work logs for a date range
workLogSchema.statics.getWorkLogs = function(organizationId, startDate, endDate) {
  return this.find({
    organization: organizationId,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate("userId", "username email role jobTitle department avatar")
    .sort({ date: -1, totalLoginTime: -1 })
}

// Static method to get user's weekly summary
workLogSchema.statics.getWeeklySummary = async function(userId, weekStartDate) {
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekEndDate.getDate() + 7)
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: weekStartDate, $lt: weekEndDate },
      },
    },
    {
      $group: {
        _id: null,
        totalLoginTime: { $sum: "$totalLoginTime" },
        totalActiveTime: { $sum: "$activeTime" },
        totalIdleTime: { $sum: "$idleTime" },
        totalSessions: { $sum: "$sessionCount" },
        totalUploads: { $sum: "$activities.uploads" },
        totalDownloads: { $sum: "$activities.downloads" },
        totalShares: { $sum: "$activities.shares" },
        daysWorked: { $sum: 1 },
      },
    },
  ])
}

// Static method to get organization daily summary
workLogSchema.statics.getOrgDailySummary = async function(organizationId, date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  return this.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        date: { $gte: startOfDay, $lte: endOfDay },
      },
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalLoginTime: { $sum: "$totalLoginTime" },
        totalActiveTime: { $sum: "$activeTime" },
        totalUploads: { $sum: "$activities.uploads" },
        totalDownloads: { $sum: "$activities.downloads" },
        totalShares: { $sum: "$activities.shares" },
        avgSessionCount: { $avg: "$sessionCount" },
      },
    },
  ])
}

module.exports = mongoose.model("WorkLog", workLogSchema)
