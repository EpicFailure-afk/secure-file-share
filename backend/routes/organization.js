const express = require("express")
const crypto = require("crypto")
const Organization = require("../models/Organization")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const UserSession = require("../models/UserSession")
const ActivityFeed = require("../models/ActivityFeed")
const WorkLog = require("../models/WorkLog")
const File = require("../models/File")
const auth = require("../middleware/auth")
const { logActivity, getActivityDescription } = require("../utils/activityTracker")

const router = express.Router()

// Middleware to check if user is a manager or higher
const managerMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user || !user.organization) {
      return res.status(403).json({ error: "You are not part of any organization" })
    }
    if (!["manager", "admin", "owner", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Manager access required" })
    }
    req.userOrg = user.organization
    req.userRole = user.role
    next()
  } catch (err) {
    res.status(500).json({ error: "Server error" })
  }
}

// Create a new organization
router.post("/create", auth, async (req, res) => {
  try {
    const { name, description, industry } = req.body
    const userId = req.user.userId

    // Check if user already owns an organization
    const existingOrg = await Organization.findOne({ owner: userId })
    if (existingOrg) {
      return res.status(400).json({ error: "You already own an organization" })
    }

    // Check if user is already in an organization
    const user = await User.findById(userId)
    if (user.organization) {
      return res.status(400).json({ error: "You are already part of an organization. Leave it first to create a new one." })
    }

    // Create organization
    const organization = new Organization({
      name,
      description: description || "",
      industry: industry || "other",
      owner: userId,
    })

    // Generate initial invite code
    organization.generateInviteCode()
    await organization.save()

    // Update user as organization owner
    user.organization = organization._id
    user.role = "owner"
    user.approvalStatus = "approved"
    await user.save()

    // Log the action
    await AuditLog.create({
      action: "organization_created",
      userId,
      details: { organizationId: organization._id, name: organization.name },
      ipAddress: req.ip,
    })

    res.status(201).json({
      message: "Organization created successfully",
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        inviteCode: organization.inviteCode,
        inviteCodeExpires: organization.inviteCodeExpires,
      },
    })
  } catch (err) {
    console.error("Error creating organization:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get organization details
router.get("/details", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user.organization) {
      return res.status(404).json({ error: "You are not part of any organization" })
    }

    const organization = await Organization.findById(user.organization)
      .populate("owner", "username email")

    if (!organization) {
      return res.status(404).json({ error: "Organization not found" })
    }

    res.json({ organization })
  } catch (err) {
    console.error("Error fetching organization:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Join organization with invite code
router.post("/join", auth, async (req, res) => {
  try {
    const { inviteCode, role, jobTitle, department } = req.body
    const userId = req.user.userId

    const user = await User.findById(userId)
    if (user.organization) {
      return res.status(400).json({ error: "You are already part of an organization" })
    }

    // Find organization by invite code (case-sensitive for alphanumeric codes)
    const organization = await Organization.findOne({
      inviteCode: inviteCode,
      inviteCodeExpires: { $gt: new Date() },
    })

    if (!organization) {
      return res.status(400).json({ error: "Invalid or expired invite code" })
    }

    // Check if organization can add more users
    if (!organization.canAddUser()) {
      return res.status(400).json({ error: "Organization has reached maximum user limit" })
    }

    // Determine approval status
    const approvalStatus = organization.settings.requireApprovalForNewUsers ? "pending" : "approved"

    // Update user
    user.organization = organization._id
    user.role = role || "staff"
    user.jobTitle = jobTitle || ""
    user.department = department || ""
    user.approvalStatus = approvalStatus
    user.storageLimit = organization.settings.maxStoragePerUser
    await user.save()

    // Update organization stats if approved
    if (approvalStatus === "approved") {
      organization.stats.totalUsers += 1
      await organization.save()
    }

    // Log the action
    await AuditLog.create({
      action: "user_joined_organization",
      userId,
      details: {
        organizationId: organization._id,
        organizationName: organization.name,
        role: user.role,
        approvalStatus,
      },
      ipAddress: req.ip,
    })

    res.json({
      message: approvalStatus === "pending"
        ? "Join request submitted. Waiting for admin approval."
        : "Successfully joined organization",
      organization: {
        id: organization._id,
        name: organization.name,
      },
      approvalStatus,
    })
  } catch (err) {
    console.error("Error joining organization:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Leave organization
router.post("/leave", auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const user = await User.findById(userId)

    if (!user.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    const organization = await Organization.findById(user.organization)

    // Owners cannot leave - they must transfer ownership or delete org
    if (organization.owner.toString() === userId) {
      return res.status(400).json({
        error: "Owners cannot leave. Transfer ownership or delete the organization.",
      })
    }

    // Update stats
    if (user.approvalStatus === "approved") {
      organization.stats.totalUsers = Math.max(0, organization.stats.totalUsers - 1)
      await organization.save()
    }

    // Log the action
    await AuditLog.create({
      action: "user_left_organization",
      userId,
      details: { organizationId: organization._id, organizationName: organization.name },
      ipAddress: req.ip,
    })

    // Remove user from organization
    user.organization = null
    user.role = "staff"
    user.approvalStatus = "approved"
    user.jobTitle = ""
    user.department = ""
    await user.save()

    res.json({ message: "Successfully left organization" })
  } catch (err) {
    console.error("Error leaving organization:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get organization members (manager/admin/owner)
router.get("/members", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, role, search } = req.query
    const user = await User.findById(req.user.userId)

    if (!user.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    // Check permissions - managers can view members too
    if (!["manager", "admin", "owner", "superadmin"].includes(user.role) && !user.permissions.canManageUsers) {
      return res.status(403).json({ error: "Permission denied" })
    }

    // Build query
    const query = { organization: user.organization }
    if (status) query.approvalStatus = status
    if (role) query.role = role
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const members = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await User.countDocuments(query)

    res.json({
      members,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    })
  } catch (err) {
    console.error("Error fetching members:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Approve/reject pending member
router.post("/members/:memberId/approve", auth, async (req, res) => {
  try {
    const { memberId } = req.params
    const { action } = req.body // "approve" or "reject"
    const adminUser = await User.findById(req.user.userId)

    if (!adminUser.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    if (!["admin", "owner", "superadmin"].includes(adminUser.role)) {
      return res.status(403).json({ error: "Permission denied" })
    }

    const member = await User.findOne({
      _id: memberId,
      organization: adminUser.organization,
      approvalStatus: "pending",
    })

    if (!member) {
      return res.status(404).json({ error: "Pending member not found" })
    }

    const organization = await Organization.findById(adminUser.organization)

    if (action === "approve") {
      member.approvalStatus = "approved"
      member.approvedBy = adminUser._id
      organization.stats.totalUsers += 1
      await organization.save()
    } else {
      member.approvalStatus = "rejected"
      member.organization = null
    }

    await member.save()

    // Log the action
    await AuditLog.create({
      action: action === "approve" ? "member_approved" : "member_rejected",
      userId: adminUser._id,
      details: { memberId, memberEmail: member.email },
      ipAddress: req.ip,
    })

    res.json({
      message: action === "approve" ? "Member approved" : "Member rejected",
      member: {
        id: member._id,
        username: member.username,
        email: member.email,
        approvalStatus: member.approvalStatus,
      },
    })
  } catch (err) {
    console.error("Error approving member:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Update member role
router.put("/members/:memberId/role", auth, async (req, res) => {
  try {
    const { memberId } = req.params
    const { role } = req.body
    const adminUser = await User.findById(req.user.userId)

    if (!adminUser.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    // Only owner can promote to admin, admins can manage staff/manager
    const organization = await Organization.findById(adminUser.organization)
    const isOwner = organization.owner.toString() === adminUser._id.toString()

    if (!isOwner && role === "admin") {
      return res.status(403).json({ error: "Only organization owner can assign admin role" })
    }

    if (!["admin", "owner", "superadmin"].includes(adminUser.role)) {
      return res.status(403).json({ error: "Permission denied" })
    }

    const member = await User.findOne({
      _id: memberId,
      organization: adminUser.organization,
    })

    if (!member) {
      return res.status(404).json({ error: "Member not found" })
    }

    // Cannot change owner's role
    if (organization.owner.toString() === memberId) {
      return res.status(400).json({ error: "Cannot change organization owner's role" })
    }

    const oldRole = member.role
    member.role = role
    await member.save()

    // Log the action
    await AuditLog.create({
      action: "member_role_updated",
      userId: adminUser._id,
      details: { memberId, memberEmail: member.email, oldRole, newRole: role },
      ipAddress: req.ip,
    })

    res.json({
      message: "Member role updated",
      member: {
        id: member._id,
        username: member.username,
        role: member.role,
      },
    })
  } catch (err) {
    console.error("Error updating member role:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Remove member from organization
router.delete("/members/:memberId", auth, async (req, res) => {
  try {
    const { memberId } = req.params
    const adminUser = await User.findById(req.user.userId)

    if (!adminUser.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    if (!["admin", "owner", "superadmin"].includes(adminUser.role)) {
      return res.status(403).json({ error: "Permission denied" })
    }

    const organization = await Organization.findById(adminUser.organization)

    // Cannot remove owner
    if (organization.owner.toString() === memberId) {
      return res.status(400).json({ error: "Cannot remove organization owner" })
    }

    const member = await User.findOne({
      _id: memberId,
      organization: adminUser.organization,
    })

    if (!member) {
      return res.status(404).json({ error: "Member not found" })
    }

    // Update stats
    if (member.approvalStatus === "approved") {
      organization.stats.totalUsers = Math.max(0, organization.stats.totalUsers - 1)
      await organization.save()
    }

    // Log the action
    await AuditLog.create({
      action: "member_removed",
      userId: adminUser._id,
      details: { memberId, memberEmail: member.email },
      ipAddress: req.ip,
    })

    // Remove from organization
    member.organization = null
    member.role = "staff"
    member.approvalStatus = "approved"
    member.jobTitle = ""
    member.department = ""
    await member.save()

    res.json({ message: "Member removed from organization" })
  } catch (err) {
    console.error("Error removing member:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Regenerate invite code
router.post("/invite-code/regenerate", auth, async (req, res) => {
  try {
    const { expiresInHours = 72 } = req.body
    const user = await User.findById(req.user.userId)

    if (!user.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    if (!["admin", "owner", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Permission denied" })
    }

    const organization = await Organization.findById(user.organization)
    const newCode = organization.generateInviteCode(expiresInHours)
    await organization.save()

    res.json({
      inviteCode: newCode,
      expiresAt: organization.inviteCodeExpires,
    })
  } catch (err) {
    console.error("Error regenerating invite code:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Update organization settings (owner only)
router.put("/settings", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)

    if (!user.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    const organization = await Organization.findById(user.organization)

    // Only owner can update settings
    if (organization.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Only organization owner can update settings" })
    }

    const { name, description, industry, settings } = req.body

    if (name) organization.name = name
    if (description !== undefined) organization.description = description
    if (industry) organization.industry = industry
    if (settings) {
      organization.settings = { ...organization.settings, ...settings }
    }

    await organization.save()

    // Log the action
    await AuditLog.create({
      action: "organization_settings_updated",
      userId: user._id,
      details: { organizationId: organization._id },
      ipAddress: req.ip,
    })

    res.json({
      message: "Organization updated successfully",
      organization,
    })
  } catch (err) {
    console.error("Error updating organization:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get organization stats (admin/owner)
router.get("/stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)

    if (!user.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    if (!["admin", "owner", "manager", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Permission denied" })
    }

    const organization = await Organization.findById(user.organization)

    // Get detailed stats
    const userStats = await User.aggregate([
      { $match: { organization: organization._id } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
          pendingUsers: { $sum: { $cond: [{ $eq: ["$approvalStatus", "pending"] }, 1, 0] } },
          totalStorage: { $sum: "$storageUsed" },
        },
      },
    ])

    const roleStats = await User.aggregate([
      { $match: { organization: organization._id, approvalStatus: "approved" } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ])

    const File = require("../models/File")
    const fileStats = await File.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "uploadedBy",
          foreignField: "_id",
          as: "uploader",
        },
      },
      { $unwind: "$uploader" },
      { $match: { "uploader.organization": organization._id } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: "$size" },
          infectedFiles: { $sum: { $cond: [{ $eq: ["$scanStatus", "infected"] }, 1, 0] } },
          revokedFiles: { $sum: { $cond: [{ $eq: ["$isRevoked", true] }, 1, 0] } },
        },
      },
    ])

    res.json({
      organization: {
        name: organization.name,
        plan: organization.subscription.plan,
        settings: organization.settings,
      },
      stats: {
        users: userStats[0] || { totalUsers: 0, activeUsers: 0, pendingUsers: 0, totalStorage: 0 },
        roles: roleStats.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
        files: fileStats[0] || { totalFiles: 0, totalSize: 0, infectedFiles: 0, revokedFiles: 0 },
      },
    })
  } catch (err) {
    console.error("Error fetching org stats:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Transfer ownership
router.post("/transfer-ownership", auth, async (req, res) => {
  try {
    const { newOwnerId } = req.body
    const user = await User.findById(req.user.userId)

    if (!user.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    const organization = await Organization.findById(user.organization)

    if (organization.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Only the owner can transfer ownership" })
    }

    const newOwner = await User.findOne({
      _id: newOwnerId,
      organization: user.organization,
      approvalStatus: "approved",
    })

    if (!newOwner) {
      return res.status(404).json({ error: "User not found in organization" })
    }

    // Transfer ownership
    organization.owner = newOwnerId
    await organization.save()

    // Update roles
    user.role = "admin"
    await user.save()

    newOwner.role = "owner"
    await newOwner.save()

    // Log the action
    await AuditLog.create({
      action: "ownership_transferred",
      userId: user._id,
      details: {
        organizationId: organization._id,
        previousOwner: user._id,
        newOwner: newOwnerId,
      },
      ipAddress: req.ip,
    })

    res.json({
      message: "Ownership transferred successfully",
      newOwner: {
        id: newOwner._id,
        username: newOwner.username,
        email: newOwner.email,
      },
    })
  } catch (err) {
    console.error("Error transferring ownership:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Delete organization (owner only)
router.delete("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)

    if (!user.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }

    const organization = await Organization.findById(user.organization)

    if (organization.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Only the owner can delete the organization" })
    }

    // Remove all users from organization
    await User.updateMany(
      { organization: organization._id },
      {
        $set: {
          organization: null,
          role: "staff",
          approvalStatus: "approved",
          jobTitle: "",
          department: "",
        },
      }
    )

    // Log the action
    await AuditLog.create({
      action: "organization_deleted",
      userId: user._id,
      details: { organizationId: organization._id, organizationName: organization.name },
      ipAddress: req.ip,
    })

    // Delete organization
    await Organization.deleteOne({ _id: organization._id })

    res.json({ message: "Organization deleted successfully" })
  } catch (err) {
    console.error("Error deleting organization:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// ============================================
// MANAGER MONITORING ROUTES
// ============================================

// Get live dashboard data (real-time overview)
router.get("/monitor/live", auth, managerMiddleware, async (req, res) => {
  try {
    const organizationId = req.userOrg
    const mongoose = require("mongoose")
    const orgObjectId = new mongoose.Types.ObjectId(organizationId)

    // First, mark sessions as offline if no activity for 2+ minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    await UserSession.updateMany(
      {
        organization: orgObjectId,
        status: { $in: ["online", "idle"] },
        logoutTime: null,
        lastActivity: { $lt: twoMinutesAgo },
      },
      {
        $set: { status: "idle" }
      }
    )
    
    // Mark as offline if no activity for 30+ minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    await UserSession.updateMany(
      {
        organization: orgObjectId,
        logoutTime: null,
        lastActivity: { $lt: thirtyMinutesAgo },
      },
      {
        $set: { 
          status: "offline",
          logoutTime: new Date()
        }
      }
    )
    
    // Get currently online users (have logoutTime = null and recent activity)
    const activeSessions = await UserSession.find({
      organization: orgObjectId,
      status: { $in: ["online", "idle"] },
      logoutTime: null,
    }).populate("userId", "username email role jobTitle department avatar")

    // Filter out sessions where user might be null
    const validSessions = activeSessions.filter(s => s.userId)

    // Get today's activity count
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const todayActivityCount = await ActivityFeed.countDocuments({
      organization: orgObjectId,
      timestamp: { $gte: startOfDay },
    })

    // Get recent 10 activities
    const recentActivities = await ActivityFeed.find({
      organization: orgObjectId,
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("userId", "username avatar role")

    // Get today's stats
    const todayStats = await ActivityFeed.aggregate([
      {
        $match: {
          organization: orgObjectId,
          timestamp: { $gte: startOfDay },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ])

    // Format stats
    const statsMap = {}
    todayStats.forEach(s => { statsMap[s._id] = s.count })

    // Calculate if truly active (activity within last 2 minutes)
    const isRecentlyActive = (lastActivity) => {
      return (new Date() - new Date(lastActivity)) < 2 * 60 * 1000
    }

    res.json({
      onlineUsers: validSessions.map(s => ({
        userId: s.userId._id,
        username: s.userId.username,
        email: s.userId.email,
        role: s.userId.role,
        jobTitle: s.userId.jobTitle,
        department: s.userId.department,
        avatar: s.userId.avatar,
        status: isRecentlyActive(s.lastActivity) ? "online" : "idle",
        loginTime: s.loginTime,
        lastActivity: s.lastActivity,
        device: s.device,
        browser: s.browser,
        sessionDuration: s.getFormattedDuration(),
        isActive: isRecentlyActive(s.lastActivity),
      })),
      onlineCount: validSessions.filter(s => isRecentlyActive(s.lastActivity)).length,
      idleCount: validSessions.filter(s => !isRecentlyActive(s.lastActivity)).length,
      todayActivityCount,
      todayStats: {
        logins: statsMap.login || 0,
        uploads: statsMap.file_upload || 0,
        downloads: statsMap.file_download || 0,
        shares: statsMap.file_share || 0,
        deletes: statsMap.file_delete || 0,
      },
      recentActivities: recentActivities.map(a => ({
        id: a._id,
        type: a.type,
        description: a.description,
        user: a.userId ? {
          id: a.userId._id,
          username: a.userId.username,
          avatar: a.userId.avatar,
          role: a.userId.role,
        } : null,
        target: a.target,
        metadata: a.metadata,
        priority: a.priority,
        timestamp: a.timestamp,
      })),
      serverTime: new Date(),
    })
  } catch (err) {
    console.error("Error fetching live dashboard:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get activity feed with pagination and filters
router.get("/monitor/activity", auth, managerMiddleware, async (req, res) => {
  try {
    const organizationId = req.userOrg
    const mongoose = require("mongoose")
    const orgObjectId = new mongoose.Types.ObjectId(organizationId)
    const { page = 1, limit = 50, type, userId, startDate, endDate, priority } = req.query

    const query = { organization: orgObjectId }

    if (type) query.type = type
    if (userId) query.userId = new mongoose.Types.ObjectId(userId)
    if (priority) query.priority = priority
    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) query.timestamp.$gte = new Date(startDate)
      if (endDate) query.timestamp.$lte = new Date(endDate)
    }

    const total = await ActivityFeed.countDocuments(query)
    const activities = await ActivityFeed.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "username email role avatar")

    res.json({
      activities: activities.map(a => ({
        id: a._id,
        type: a.type,
        description: a.description,
        user: a.userId ? {
          id: a.userId._id,
          username: a.userId.username,
          email: a.userId.email,
          role: a.userId.role,
          avatar: a.userId.avatar,
        } : null,
        target: a.target,
        metadata: a.metadata,
        priority: a.priority,
        timestamp: a.timestamp,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error("Error fetching activity feed:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get all user sessions (current and historical)
router.get("/monitor/sessions", auth, managerMiddleware, async (req, res) => {
  try {
    const organizationId = req.userOrg
    const mongoose = require("mongoose")
    const orgObjectId = new mongoose.Types.ObjectId(organizationId)
    const { status, userId, startDate, endDate, page = 1, limit = 50 } = req.query

    const query = { organization: orgObjectId }

    if (status === "active") {
      query.logoutTime = null
      query.status = { $in: ["online", "idle"] }
    } else if (status === "ended") {
      query.$or = [
        { logoutTime: { $ne: null } },
        { status: "offline" }
      ]
    }
    if (userId) query.userId = new mongoose.Types.ObjectId(userId)
    if (startDate || endDate) {
      query.loginTime = {}
      if (startDate) query.loginTime.$gte = new Date(startDate)
      if (endDate) query.loginTime.$lte = new Date(endDate)
    }

    const total = await UserSession.countDocuments(query)
    const sessions = await UserSession.find(query)
      .sort({ loginTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "username email role jobTitle department avatar")

    // Calculate if session is truly active (for duration display)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    
    res.json({
      sessions: sessions.filter(s => s.userId).map(s => {
        const isActive = !s.logoutTime && s.status !== "offline" && s.lastActivity >= twoMinutesAgo
        return {
          id: s._id,
          sessionId: s.sessionId,
          user: {
            id: s.userId._id,
            username: s.userId.username,
            email: s.userId.email,
            role: s.userId.role,
            jobTitle: s.userId.jobTitle,
            department: s.userId.department,
            avatar: s.userId.avatar,
          },
          status: isActive ? "online" : (s.logoutTime ? "offline" : "idle"),
          isActive,
          loginTime: s.loginTime,
          logoutTime: s.logoutTime,
          lastActivity: s.lastActivity,
          duration: s.getFormattedDuration(),
          durationSeconds: s.getDuration(),
          device: s.device,
          browser: s.browser,
          os: s.os,
          ipAddress: s.ipAddress,
          activityBreakdown: s.activityBreakdown,
        }
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error("Error fetching sessions:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get work logs (hours worked per user)
router.get("/monitor/worklogs", auth, managerMiddleware, async (req, res) => {
  try {
    const organizationId = req.userOrg
    const mongoose = require("mongoose")
    const orgObjectId = new mongoose.Types.ObjectId(organizationId)
    const { userId, startDate, endDate, page = 1, limit = 50 } = req.query

    // Default to last 7 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date()
    end.setHours(23, 59, 59, 999)
    const start = startDate ? new Date(startDate) : new Date(end)
    if (!startDate) start.setDate(start.getDate() - 7)
    start.setHours(0, 0, 0, 0)

    const query = {
      organization: orgObjectId,
      date: { $gte: start, $lte: end },
    }
    if (userId) query.userId = new mongoose.Types.ObjectId(userId)

    const total = await WorkLog.countDocuments(query)
    const workLogs = await WorkLog.find(query)
      .sort({ date: -1, totalLoginTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("userId", "username email role jobTitle department avatar")

    // Helper to format seconds to hours:minutes
    const formatTime = (seconds) => {
      if (!seconds || seconds === 0) return "0h 0m"
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }

    // Calculate totals
    const totals = await WorkLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalLoginTime: { $sum: "$totalLoginTime" },
          totalActiveTime: { $sum: "$activeTime" },
          totalUploads: { $sum: "$activities.uploads" },
          totalDownloads: { $sum: "$activities.downloads" },
          totalShares: { $sum: "$activities.shares" },
        },
      },
    ])

    res.json({
      workLogs: workLogs.filter(w => w.userId).map(w => ({
        id: w._id,
        user: {
          id: w.userId._id,
          username: w.userId.username,
          email: w.userId.email,
          role: w.userId.role,
          jobTitle: w.userId.jobTitle,
          department: w.userId.department,
          avatar: w.userId.avatar,
        },
        date: w.date,
        totalLoginTime: w.totalLoginTime || 0,
        formattedLoginTime: formatTime(w.totalLoginTime),
        activeTime: w.activeTime || 0,
        formattedActiveTime: formatTime(w.activeTime),
        idleTime: w.idleTime || 0,
        firstLogin: w.firstLogin,
        lastLogout: w.lastLogout,
        sessionCount: w.sessionCount || 0,
        activities: w.activities || { uploads: 0, downloads: 0, shares: 0, deletes: 0, views: 0 },
        hourlyBreakdown: w.hourlyBreakdown || [],
      })),
      totals: totals[0] || {
        totalLoginTime: 0,
        totalActiveTime: 0,
        totalUploads: 0,
        totalDownloads: 0,
        totalShares: 0,
      },
      dateRange: { start, end },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error("Error fetching work logs:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get individual user's detailed stats
router.get("/monitor/user/:userId", auth, managerMiddleware, async (req, res) => {
  try {
    const organizationId = req.userOrg
    const { userId } = req.params
    const { days = 7 } = req.query

    // Verify user is in the same organization
    const targetUser = await User.findOne({
      _id: userId,
      organization: organizationId,
    }).select("-password")

    if (!targetUser) {
      return res.status(404).json({ error: "User not found in your organization" })
    }

    // Get date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(days))
    startDate.setHours(0, 0, 0, 0)

    // Get current session if online
    const currentSession = await UserSession.findOne({
      userId,
      organization: organizationId,
      logoutTime: null,
    })

    // Get work logs for the period
    const workLogs = await WorkLog.find({
      userId,
      organization: organizationId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 })

    // Get recent activities
    const recentActivities = await ActivityFeed.find({
      userId,
      organization: organizationId,
    })
      .sort({ timestamp: -1 })
      .limit(50)

    // Get file stats
    const fileStats = await File.aggregate([
      { $match: { owner: targetUser._id } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: "$size" },
          sharedFiles: {
            $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$sharedWith", []] } }, 0] }, 1, 0] },
          },
        },
      },
    ])

    // Calculate summary stats
    const totalLoginTime = workLogs.reduce((sum, w) => sum + w.totalLoginTime, 0)
    const totalActiveTime = workLogs.reduce((sum, w) => sum + w.activeTime, 0)
    const totalUploads = workLogs.reduce((sum, w) => sum + w.activities.uploads, 0)
    const totalDownloads = workLogs.reduce((sum, w) => sum + w.activities.downloads, 0)
    const totalShares = workLogs.reduce((sum, w) => sum + w.activities.shares, 0)

    res.json({
      user: {
        id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        jobTitle: targetUser.jobTitle,
        department: targetUser.department,
        avatar: targetUser.avatar,
        lastLogin: targetUser.lastLogin,
        createdAt: targetUser.createdAt,
      },
      currentSession: currentSession ? {
        status: currentSession.status,
        loginTime: currentSession.loginTime,
        lastActivity: currentSession.lastActivity,
        duration: currentSession.getFormattedDuration(),
        device: currentSession.device,
        browser: currentSession.browser,
      } : null,
      isOnline: !!currentSession,
      summary: {
        daysTracked: workLogs.length,
        totalLoginTime,
        formattedLoginTime: formatDuration(totalLoginTime),
        totalActiveTime,
        formattedActiveTime: formatDuration(totalActiveTime),
        avgDailyTime: workLogs.length > 0 ? Math.round(totalLoginTime / workLogs.length) : 0,
        formattedAvgDailyTime: formatDuration(workLogs.length > 0 ? Math.round(totalLoginTime / workLogs.length) : 0),
        totalUploads,
        totalDownloads,
        totalShares,
      },
      fileStats: fileStats[0] || { totalFiles: 0, totalSize: 0, sharedFiles: 0 },
      workLogs: workLogs.map(w => ({
        date: w.date,
        totalLoginTime: w.totalLoginTime,
        formattedTime: formatDuration(w.totalLoginTime),
        sessionCount: w.sessionCount,
        activities: w.activities,
        firstLogin: w.firstLogin,
        lastLogout: w.lastLogout,
      })),
      recentActivities: recentActivities.map(a => ({
        type: a.type,
        description: a.description,
        target: a.target,
        timestamp: a.timestamp,
      })),
    })
  } catch (err) {
    console.error("Error fetching user stats:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get organization-wide statistics
router.get("/monitor/stats", auth, managerMiddleware, async (req, res) => {
  try {
    const organizationId = req.userOrg
    const { period = "week" } = req.query

    // Calculate date range based on period
    const endDate = new Date()
    const startDate = new Date()
    switch (period) {
      case "day":
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate.setDate(startDate.getDate() - 7)
        break
      case "month":
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
    }

    // Get member count
    const memberCount = await User.countDocuments({
      organization: organizationId,
      approvalStatus: "approved",
    })

    // Get activity breakdown
    const activityStats = await ActivityFeed.aggregate([
      {
        $match: {
          organization: organizationId,
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

    // Get daily activity trend
    const dailyTrend = await ActivityFeed.aggregate([
      {
        $match: {
          organization: organizationId,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Get top active users
    const topUsers = await WorkLog.aggregate([
      {
        $match: {
          organization: organizationId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$userId",
          totalLoginTime: { $sum: "$totalLoginTime" },
          totalActivities: {
            $sum: {
              $add: [
                "$activities.uploads",
                "$activities.downloads",
                "$activities.shares",
              ],
            },
          },
        },
      },
      { $sort: { totalLoginTime: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ])

    // Get file statistics
    const fileStats = await File.aggregate([
      {
        $match: {
          organization: organizationId,
        },
      },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: "$size" },
        },
      },
    ])

    // Format activity stats
    const activityMap = {}
    activityStats.forEach(s => { activityMap[s._id] = s.count })

    res.json({
      period,
      dateRange: { start: startDate, end: endDate },
      overview: {
        memberCount,
        totalActivities: activityStats.reduce((sum, s) => sum + s.count, 0),
        totalFiles: fileStats[0]?.totalFiles || 0,
        totalStorage: fileStats[0]?.totalSize || 0,
      },
      activityBreakdown: {
        logins: activityMap.login || 0,
        uploads: activityMap.file_upload || 0,
        downloads: activityMap.file_download || 0,
        shares: activityMap.file_share || 0,
        deletes: activityMap.file_delete || 0,
        views: activityMap.file_view || 0,
      },
      dailyTrend: dailyTrend.map(d => ({
        date: d._id,
        activities: d.count,
      })),
      topUsers: topUsers.map(u => ({
        userId: u._id,
        username: u.user.username,
        email: u.user.email,
        role: u.user.role,
        avatar: u.user.avatar,
        totalLoginTime: u.totalLoginTime,
        formattedTime: formatDuration(u.totalLoginTime),
        totalActivities: u.totalActivities,
      })),
    })
  } catch (err) {
    console.error("Error fetching org stats:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Get file activity for a specific file
router.get("/monitor/file/:fileId", auth, managerMiddleware, async (req, res) => {
  try {
    const organizationId = req.userOrg
    const { fileId } = req.params

    // Get file info
    const file = await File.findOne({
      _id: fileId,
      organization: organizationId,
    }).populate("owner", "username email role avatar")

    if (!file) {
      return res.status(404).json({ error: "File not found" })
    }

    // Get all activities for this file
    const activities = await ActivityFeed.find({
      organization: organizationId,
      "target.id": fileId,
    })
      .sort({ timestamp: -1 })
      .populate("userId", "username email role avatar")

    res.json({
      file: {
        id: file._id,
        name: file.name,
        size: file.size,
        type: file.type,
        owner: file.owner,
        createdAt: file.createdAt,
        sharedWith: file.sharedWith,
      },
      activities: activities.map(a => ({
        type: a.type,
        description: a.description,
        user: a.userId ? {
          id: a.userId._id,
          username: a.userId.username,
          role: a.userId.role,
          avatar: a.userId.avatar,
        } : null,
        timestamp: a.timestamp,
      })),
      stats: {
        totalViews: activities.filter(a => a.type === "file_view").length,
        totalDownloads: activities.filter(a => a.type === "file_download").length,
        totalShares: activities.filter(a => a.type === "file_share").length,
      },
    })
  } catch (err) {
    console.error("Error fetching file activity:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Heartbeat endpoint for session tracking
router.post("/monitor/heartbeat", auth, async (req, res) => {
  try {
    const { sessionId } = req.body
    const userId = req.user.userId

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" })
    }

    const session = await UserSession.findOne({
      sessionId,
      userId,
      logoutTime: null,
    })

    if (!session) {
      return res.status(404).json({ error: "Session not found" })
    }

    const now = new Date()
    const timeSinceLastActivity = (now - session.lastActivity) / 1000

    // Update activity time in work log
    if (session.organization && timeSinceLastActivity < 300) {
      const workLog = await WorkLog.getOrCreateToday(userId, session.organization)
      workLog.activeTime += Math.min(timeSinceLastActivity, 60) // Cap at 1 minute per heartbeat
      
      // Update hourly breakdown
      const currentHour = now.getHours()
      const hourIndex = workLog.hourlyBreakdown.findIndex(h => h.hour === currentHour)
      if (hourIndex >= 0) {
        workLog.hourlyBreakdown[hourIndex].activeMinutes += 1
      } else {
        workLog.hourlyBreakdown.push({
          hour: currentHour,
          activeMinutes: 1,
          activities: 0,
        })
      }
      
      await workLog.save()
    }

    // Update session
    session.lastActivity = now
    session.status = "online"
    await session.save()

    res.json({ success: true, status: session.status })
  } catch (err) {
    console.error("Error updating heartbeat:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Helper function to format duration
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Cleanup stale sessions (manager can trigger this)
router.post("/monitor/cleanup-sessions", auth, managerMiddleware, async (req, res) => {
  try {
    const organizationId = req.userOrg
    
    // Cleanup sessions with no activity for 30+ minutes
    const cleanedCount = await UserSession.cleanupStaleSessions(organizationId)
    
    res.json({ 
      success: true, 
      message: `Cleaned up ${cleanedCount} stale sessions`,
      cleanedCount 
    })
  } catch (err) {
    console.error("Error cleaning up sessions:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Reset all sessions for organization (admin/owner only)
router.post("/monitor/reset-sessions", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    
    if (!user.organization) {
      return res.status(400).json({ error: "You are not part of any organization" })
    }
    
    if (!["admin", "owner", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Admin access required" })
    }
    
    // Close all open sessions for this organization
    const result = await UserSession.updateMany(
      { 
        organization: user.organization, 
        logoutTime: null,
        status: { $in: ["online", "idle"] }
      },
      { 
        $set: { 
          logoutTime: new Date(), 
          status: "offline" 
        } 
      }
    )
    
    res.json({ 
      success: true, 
      message: `Reset ${result.modifiedCount} sessions`,
      resetCount: result.modifiedCount 
    })
  } catch (err) {
    console.error("Error resetting sessions:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
