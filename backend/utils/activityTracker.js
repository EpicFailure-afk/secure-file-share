const UserSession = require("../models/UserSession")
const ActivityFeed = require("../models/ActivityFeed")
const WorkLog = require("../models/WorkLog")
const crypto = require("crypto")

// Parse user agent string
const parseUserAgent = (userAgent) => {
  if (!userAgent) return { device: "Unknown", browser: "Unknown", os: "Unknown" }
  
  let device = "Desktop"
  let browser = "Unknown"
  let os = "Unknown"
  
  // Detect device
  if (/mobile/i.test(userAgent)) device = "Mobile"
  else if (/tablet|ipad/i.test(userAgent)) device = "Tablet"
  
  // Detect browser
  if (/firefox/i.test(userAgent)) browser = "Firefox"
  else if (/edg/i.test(userAgent)) browser = "Edge"
  else if (/chrome/i.test(userAgent)) browser = "Chrome"
  else if (/safari/i.test(userAgent)) browser = "Safari"
  else if (/opera|opr/i.test(userAgent)) browser = "Opera"
  
  // Detect OS
  if (/windows/i.test(userAgent)) os = "Windows"
  else if (/macintosh|mac os/i.test(userAgent)) os = "macOS"
  else if (/linux/i.test(userAgent)) os = "Linux"
  else if (/android/i.test(userAgent)) os = "Android"
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS"
  
  return { device, browser, os }
}

// Create a new session when user logs in
const createSession = async (userId, organizationId, ipAddress, userAgent) => {
  try {
    const sessionId = crypto.randomBytes(32).toString("hex")
    const { device, browser, os } = parseUserAgent(userAgent)
    
    const session = await UserSession.create({
      userId,
      organization: organizationId,
      sessionId,
      status: "online",
      loginTime: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent,
      device,
      browser,
      os,
    })
    
    // Update work log
    if (organizationId) {
      const workLog = await WorkLog.getOrCreateToday(userId, organizationId)
      workLog.sessionCount += 1
      if (!workLog.firstLogin) {
        workLog.firstLogin = new Date()
      }
      await workLog.save()
    }
    
    return session
  } catch (error) {
    console.error("Error creating session:", error)
    return null
  }
}

// End session when user logs out
const endSession = async (sessionId) => {
  try {
    const session = await UserSession.findOne({ sessionId, logoutTime: null })
    if (!session) return null
    
    session.logoutTime = new Date()
    session.status = "offline"
    session.totalActiveTime = session.getDuration()
    await session.save()
    
    // Update work log
    if (session.organization) {
      const workLog = await WorkLog.getOrCreateToday(session.userId, session.organization)
      workLog.totalLoginTime += session.totalActiveTime
      workLog.lastLogout = new Date()
      await workLog.save()
    }
    
    return session
  } catch (error) {
    console.error("Error ending session:", error)
    return null
  }
}

// Update session activity (heartbeat)
const updateSessionActivity = async (sessionId) => {
  try {
    const session = await UserSession.findOne({ sessionId, logoutTime: null })
    if (!session) return null
    
    const now = new Date()
    const timeSinceLastActivity = (now - session.lastActivity) / 1000 // in seconds
    
    // If more than 5 minutes since last activity, mark as idle
    if (timeSinceLastActivity > 300) {
      session.status = "idle"
      session.idleTime += timeSinceLastActivity
    } else {
      session.status = "online"
    }
    
    session.lastActivity = now
    await session.save()
    
    return session
  } catch (error) {
    console.error("Error updating session activity:", error)
    return null
  }
}

// Log an activity to the feed
const logActivity = async ({
  organizationId,
  userId,
  type,
  targetType = "system",
  targetId = null,
  targetName = null,
  description,
  metadata = {},
  priority = "normal",
}) => {
  try {
    if (!organizationId) return null
    
    const activity = await ActivityFeed.create({
      organization: organizationId,
      userId,
      type,
      target: {
        type: targetType,
        id: targetId,
        name: targetName,
      },
      description,
      metadata,
      priority,
      timestamp: new Date(),
    })
    
    // Update work log activity counts
    const workLog = await WorkLog.getOrCreateToday(userId, organizationId)
    
    switch (type) {
      case "file_upload":
        workLog.activities.uploads += 1
        break
      case "file_download":
        workLog.activities.downloads += 1
        break
      case "file_share":
        workLog.activities.shares += 1
        break
      case "file_delete":
        workLog.activities.deletes += 1
        break
      case "file_view":
        workLog.activities.views += 1
        break
    }
    
    // Update hourly breakdown
    const currentHour = new Date().getHours()
    const hourIndex = workLog.hourlyBreakdown.findIndex(h => h.hour === currentHour)
    if (hourIndex >= 0) {
      workLog.hourlyBreakdown[hourIndex].activities += 1
    } else {
      workLog.hourlyBreakdown.push({
        hour: currentHour,
        activeMinutes: 0,
        activities: 1,
      })
    }
    
    await workLog.save()
    
    return activity
  } catch (error) {
    console.error("Error logging activity:", error)
    return null
  }
}

// Mark inactive sessions as offline (run periodically)
const cleanupInactiveSessions = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    
    // Mark sessions idle after 5 minutes of inactivity
    await UserSession.updateMany(
      {
        status: "online",
        lastActivity: { $lt: fiveMinutesAgo },
        logoutTime: null,
      },
      { status: "idle" }
    )
    
    // Auto-logout sessions after 30 minutes of inactivity
    const inactiveSessions = await UserSession.find({
      lastActivity: { $lt: thirtyMinutesAgo },
      logoutTime: null,
    })
    
    for (const session of inactiveSessions) {
      await endSession(session.sessionId)
    }
    
    console.log(`Cleaned up ${inactiveSessions.length} inactive sessions`)
  } catch (error) {
    console.error("Error cleaning up sessions:", error)
  }
}

// Get formatted activity description
const getActivityDescription = (type, userName, targetName, metadata = {}) => {
  const descriptions = {
    login: `${userName} logged in`,
    logout: `${userName} logged out`,
    file_upload: `${userName} uploaded "${targetName}"`,
    file_download: `${userName} downloaded "${targetName}"`,
    file_share: `${userName} shared "${targetName}" ${metadata.sharedWith ? `with ${metadata.sharedWith}` : ""}`,
    file_delete: `${userName} deleted "${targetName}"`,
    file_view: `${userName} viewed "${targetName}"`,
    file_revoke: `${userName} revoked access to "${targetName}"`,
    file_expire: `File "${targetName}" has expired`,
    profile_update: `${userName} updated their profile`,
    password_change: `${userName} changed their password`,
    member_join: `${userName} joined the organization`,
    member_leave: `${userName} left the organization`,
    role_change: `${userName}'s role was changed to ${metadata.newValue || "unknown"}`,
    settings_change: `${userName} updated organization settings`,
  }
  
  return descriptions[type] || `${userName} performed an action`
}

module.exports = {
  createSession,
  endSession,
  updateSessionActivity,
  logActivity,
  cleanupInactiveSessions,
  getActivityDescription,
  parseUserAgent,
}
