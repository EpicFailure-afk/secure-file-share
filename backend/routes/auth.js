const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const Token = require("../models/Token")
const Organization = require("../models/Organization")
const { sendVerificationEmail } = require("../utils/email")
const { createSession, logActivity, getActivityDescription } = require("../utils/activityTracker")

const router = express.Router()

// Generate alphanumeric invite code (uppercase + lowercase + numbers)
const generateInviteCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let code = ""
  const randomBytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length]
  }
  return code
}

//! Register a new user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role, inviteCode, jobTitle, department, createOrg, organizationName } = req.body

    // Check if email already exists
    const existingEmail = await User.findOne({ email })
    if (existingEmail) return res.status(400).json({ error: "User with this email already exists" })

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword,
      role: createOrg ? "manager" : (role || "staff"),
      jobTitle: jobTitle || "",
      department: department || "",
      approvalStatus: "approved",
    })

    // If creating a new organization
    if (createOrg && organizationName) {
      // Check if organization name already exists
      const existingOrg = await Organization.findOne({ 
        name: { $regex: new RegExp(`^${organizationName.trim()}$`, "i") }
      })
      if (existingOrg) {
        return res.status(400).json({ error: "Organization name already exists. Please choose a different name." })
      }

      // Save user first to get the ID
      await newUser.save()

      // Create the organization with the user as owner
      const slug = organizationName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      const inviteCode = generateInviteCode(8)
      
      const newOrg = new Organization({
        name: organizationName.trim(),
        slug: `${slug}-${Date.now().toString(36)}`,
        owner: newUser._id,
        inviteCode: inviteCode,
        inviteCodeExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        stats: { totalUsers: 1 },
      })
      
      await newOrg.save()

      // Update user with organization reference
      newUser.organization = newOrg._id
      newUser.role = "manager"
      await newUser.save()

      return res.status(201).json({ 
        message: `Registration successful! Your organization "${organizationName}" has been created. Invite code: ${inviteCode}`,
        organizationId: newOrg._id,
        inviteCode: inviteCode,
      })
    }

    // If invite code provided, join organization
    if (inviteCode) {
      const organization = await Organization.findOne({
        inviteCode: inviteCode, // Case-sensitive matching for alphanumeric codes
        inviteCodeExpires: { $gt: new Date() },
      })

      if (!organization) {
        return res.status(400).json({ error: "Invalid or expired invite code" })
      }

      if (!organization.canAddUser()) {
        return res.status(400).json({ error: "Organization has reached maximum user limit" })
      }

      newUser.organization = organization._id
      newUser.approvalStatus = organization.settings.requireApprovalForNewUsers ? "pending" : "approved"
      newUser.storageLimit = organization.settings.maxStoragePerUser

      // Update org stats if auto-approved
      if (newUser.approvalStatus === "approved") {
        organization.stats.totalUsers += 1
        await organization.save()
      }
    }

    await newUser.save()

    res.status(201).json({ 
      message: newUser.approvalStatus === "pending" 
        ? "Registration successful. Waiting for organization admin approval."
        : "User registered successfully",
      approvalStatus: newUser.approvalStatus,
    })
  } catch (err) {
    console.error("Error in register:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Request login token (step 1 of 2-step login)
router.post("/request-token", async (req, res) => {
  try {
    const { email, password } = req.body

    // Check if user exists
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: "Invalid email or password" })

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" })

    // Generate a random 6-character token
    const loginToken = crypto.randomBytes(3).toString("hex")

    // Save token to database with expiration
    const tokenDoc = new Token({
      userId: user._id,
      token: loginToken,
      type: "login",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    })
    await tokenDoc.save()

    // Send token via email
    await sendVerificationEmail(user.email, loginToken, "login")

    res.json({ success: true, message: "Verification code sent to your email" })
  } catch (err) {
    console.error("Error in request-token:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Verify login token (step 2 of 2-step login)
router.post("/verify-token", async (req, res) => {
  try {
    const { email, token } = req.body

    // Find user
    const user = await User.findOne({ email }).populate("organization", "name slug")
    if (!user) return res.status(400).json({ error: "User not found" })

    // Check if user is approved (if in org)
    if (user.organization && user.approvalStatus === "pending") {
      return res.status(403).json({ error: "Your account is pending approval from organization admin" })
    }

    if (user.organization && user.approvalStatus === "rejected") {
      return res.status(403).json({ error: "Your organization membership was rejected" })
    }

    // Find token in database
    const tokenDoc = await Token.findOne({
      userId: user._id,
      token,
      type: "login",
      expiresAt: { $gt: new Date() },
    })

    if (!tokenDoc) return res.status(400).json({ error: "Invalid or expired token" })

    // Delete the token after use
    await Token.deleteOne({ _id: tokenDoc._id })

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Create session for tracking
    let sessionId = null
    if (user.organization) {
      const session = await createSession(
        user._id,
        user.organization._id,
        req.ip,
        req.headers["user-agent"]
      )
      if (session) {
        sessionId = session.sessionId
        
        // Log login activity
        await logActivity({
          organizationId: user.organization._id,
          userId: user._id,
          type: "login",
          description: getActivityDescription("login", user.username),
          metadata: {
            ipAddress: req.ip,
            device: session.device,
          },
          priority: "normal",
        })
      }
    }

    // Generate JWT token with role and org info
    const jwtToken = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        organizationId: user.organization?._id || null,
        sessionId: sessionId,
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: "8h" }
    )

    res.json({ 
      token: jwtToken, 
      sessionId: sessionId,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        organization: user.organization ? {
          id: user.organization._id,
          name: user.organization.name,
          slug: user.organization.slug,
        } : null,
        permissions: user.permissions,
      },
    })
  } catch (err) {
    console.error("Error in verify-token:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Request password reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body

    // Check if user exists
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: "User not found" })

    // Generate a random 6-character token
    const resetToken = crypto.randomBytes(3).toString("hex")

    // Save token to database with expiration
    const tokenDoc = new Token({
      userId: user._id,
      token: resetToken,
      type: "reset",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    })
    await tokenDoc.save()

    // Send token via email
    await sendVerificationEmail(user.email, resetToken, "reset")

    res.json({ success: true, message: "Password reset code sent to your email" })
  } catch (err) {
    console.error("Error in forgot-password:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: "User not found" })

    // Find token in database
    const tokenDoc = await Token.findOne({
      userId: user._id,
      token,
      type: "reset",
      expiresAt: { $gt: new Date() },
    })

    if (!tokenDoc) return res.status(400).json({ error: "Invalid or expired token" })

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user's password
    user.password = hashedPassword
    await user.save()

    // Delete the token after use
    await Token.deleteOne({ _id: tokenDoc._id })

    res.json({ success: true, message: "Password reset successful" })
  } catch (err) {
    console.error("Error in reset-password:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Logout - end session
router.post("/logout", async (req, res) => {
  try {
    const { sessionId } = req.body
    const authHeader = req.headers.authorization
    
    if (!sessionId && !authHeader) {
      return res.json({ success: true, message: "Logged out" })
    }

    // Try to get sessionId from JWT if not provided
    let sid = sessionId
    if (!sid && authHeader) {
      try {
        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        sid = decoded.sessionId
      } catch (e) {
        // Token might be expired, that's ok
      }
    }

    if (sid) {
      const { endSession, logActivity, getActivityDescription } = require("../utils/activityTracker")
      const UserSession = require("../models/UserSession")
      
      const session = await UserSession.findOne({ sessionId: sid }).populate("userId", "username")
      
      if (session) {
        await endSession(sid)
        
        // Log logout activity
        if (session.organization && session.userId) {
          await logActivity({
            organizationId: session.organization,
            userId: session.userId._id,
            type: "logout",
            description: getActivityDescription("logout", session.userId.username),
            priority: "normal",
          })
        }
      }
    }

    res.json({ success: true, message: "Logged out successfully" })
  } catch (err) {
    console.error("Error in logout:", err)
    res.json({ success: true, message: "Logged out" })
  }
})

//! Heartbeat to keep session alive
const UserSession = require("../models/UserSession")
const WorkLog = require("../models/WorkLog")
const auth = require("../middleware/auth")

router.post("/heartbeat", auth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" })
    }

    // Find the active session
    const session = await UserSession.findOne({
      userId: req.user.id,
      sessionToken: token,
      isOnline: true,
    })

    if (!session) {
      return res.status(404).json({ error: "No active session found" })
    }

    const now = new Date()
    const timeSinceLastActivity = now - session.lastActivity

    // Update work duration (only if reasonable time gap - less than 5 minutes)
    if (timeSinceLastActivity < 5 * 60 * 1000) {
      session.workDurationMs += timeSinceLastActivity
    } else {
      // User was away, record a break
      session.breakDuration = (session.breakDuration || 0) + timeSinceLastActivity
    }

    session.lastActivity = now
    await session.save()

    // Update WorkLog for today
    if (req.user.organization) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const workLog = await WorkLog.getOrCreateLog(
        req.user.id,
        req.user.organization,
        today
      )
      
      if (timeSinceLastActivity < 5 * 60 * 1000) {
        workLog.totalWorkMs += timeSinceLastActivity
      }
      workLog.lastActive = now
      await workLog.save()
    }

    res.json({ 
      success: true, 
      sessionId: session._id,
      workDuration: session.getWorkHours(),
      workDurationFormatted: session.formatWorkTime()
    })
  } catch (err) {
    console.error("Error in heartbeat:", err)
    res.status(500).json({ error: "Failed to update heartbeat" })
  }
})

module.exports = router

