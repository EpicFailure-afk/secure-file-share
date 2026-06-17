const express = require("express")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const Token = require("../models/Token")
const Organization = require("../models/Organization")
const UserSession = require("../models/UserSession")
const SystemSettings = require("../models/SystemSettings")

// How long an account stays locked after exceeding max_login_attempts
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const { sendVerificationEmail, sendEmail } = require("../utils/email")
const { createSession, logActivity, getActivityDescription } = require("../utils/activityTracker")
const {
  loginLimiter,
  loginAccountLimiter,
  otpLimiter,
  otpAccountLimiter,
  forgotPasswordLimiter,
} = require("../middleware/rateLimit")
const { validate } = require("../middleware/validate")
const { auth: authSchemas } = require("../validators/schemas")
const { hashPassword, verifyPassword, needsRehash } = require("../utils/passwords")
const { generateOtp } = require("../utils/otp")
const {
  signAccessToken,
  issueRefreshToken,
  findValidRefreshToken,
  rotateRefreshToken,
  hashToken,
  ACCESS_TTL_SECONDS,
} = require("../utils/tokens")
const RefreshToken = require("../models/RefreshToken")

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
router.post("/register", validate({ body: authSchemas.register }), async (req, res) => {
  try {
    // NOTE: `role` is intentionally NOT read from the request body. The role is
    // decided entirely server-side (createOrg => manager, otherwise => staff) so
    // a tampered request that sends role=manager/admin can never escalate.
    const { username, email, password, inviteCode, jobTitle, department, createOrg, organizationName } = req.body

    // Check if email already exists
    const existingEmail = await User.findOne({ email })
    if (existingEmail) return res.status(400).json({ error: "User with this email already exists" })

    // Hash the password (Argon2id)
    const hashedPassword = await hashPassword(password)

    // Create new user
    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword,
      // Org creators become managers; everyone else (join-via-invite or solo
      // sign-up) is always staff — the body role is never trusted.
      role: createOrg ? "manager" : "staff",
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
router.post("/request-token", loginLimiter, loginAccountLimiter, validate({ body: authSchemas.requestToken }), async (req, res) => {
  try {
    const { email, password } = req.body

    // Check if user exists
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: "Invalid email or password" })

    // Account lockout: refuse if the account is currently locked. This layers
    // on top of the per-IP/per-account rate limiter — the limiter slows guessing
    // across requests, the lockout stops it for a window after N bad passwords.
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil - new Date()) / 60000)
      return res.status(423).json({
        error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      })
    }

    // Check password (supports both legacy bcrypt and Argon2id hashes)
    const isMatch = await verifyPassword(password, user.password)
    if (!isMatch) {
      // Count the failure and lock the account once it exceeds the configured max
      const maxAttempts = (await SystemSettings.getSetting("max_login_attempts")) || 5
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1
      if (user.failedLoginAttempts >= maxAttempts) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
        user.failedLoginAttempts = 0
      }
      await user.save()
      return res.status(400).json({ error: "Invalid email or password" })
    }

    // Successful password check — clear any failed-attempt counter / lock
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0
      user.lockUntil = null
    }

    // Lazily upgrade legacy bcrypt hashes to Argon2id on successful login
    if (needsRehash(user.password)) {
      try {
        user.password = await hashPassword(password)
      } catch (rehashErr) {
        console.error("Password rehash failed (non-fatal):", rehashErr.message)
      }
    }
    await user.save()

    // Generate a strong mixed-character-class login code (CSPRNG, case-sensitive)
    const loginToken = generateOtp(8)

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
router.post("/verify-token", otpLimiter, otpAccountLimiter, validate({ body: authSchemas.verifyToken }), async (req, res) => {
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

    // Context-aware login: flag a sign-in from a new device or location and
    // notify the user (non-blocking). This also records a high-priority signal
    // that the Phase 7 risk engine will consume. Detection compares against the
    // user's prior sessions, so it never fires on a user's very first login.
    try {
      const { parseUserAgent } = require("../utils/activityTracker")
      const ua = req.headers["user-agent"]
      const ip = req.ip
      const { device, browser, os } = parseUserAgent(ua)
      const priorSessions = await UserSession.find({ userId: user._id })
        .sort({ loginTime: -1 })
        .limit(50)

      if (priorSessions.length > 0) {
        const knownSignature = priorSessions.some(
          (s) => s.browser === browser && s.os === os && s.device === device,
        )
        const knownIp = priorSessions.some((s) => s.ipAddress === ip)

        if (!knownSignature || !knownIp) {
          const reasons = []
          if (!knownSignature) reasons.push(`a new device/browser (${browser} on ${os})`)
          if (!knownIp) reasons.push(`a new location (IP ${ip})`)
          const reasonText = reasons.join(" and ")

          sendEmail(
            user.email,
            "New sign-in to your Secure Vault account",
            `We detected a sign-in to your account from ${reasonText} at ${new Date().toUTCString()}.\n\n` +
              `If this was you, you can ignore this message. If not, change your password and use ` +
              `"Log out of all devices" immediately.`,
          ).catch((e) => console.error("New-device email failed (non-fatal):", e.message))

          if (user.organization) {
            logActivity({
              organizationId: user.organization._id,
              userId: user._id,
              type: "login",
              description: `${user.username} signed in from ${reasonText}`,
              metadata: { ipAddress: ip, device, browser, os, newDevice: !knownSignature, newLocation: !knownIp },
              priority: "high",
            }).catch(() => {})
          }
        }
      }
    } catch (ctxErr) {
      console.error("Context-aware login check failed (non-fatal):", ctxErr.message)
    }

    // Close any existing open sessions for this user (prevents duplicate active sessions)
    await UserSession.updateMany(
      { 
        userId: user._id, 
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

    // Issue a short-lived access token + a revocable refresh token. The access
    // token keeps the same claims as before (so all existing routes keep
    // working); the refresh token is tracked server-side for revocation.
    const accessToken = signAccessToken({
      userId: user._id,
      role: user.role,
      organizationId: user.organization?._id || null,
      sessionId: sessionId,
    })
    const { raw: refreshToken } = await issueRefreshToken(
      user._id,
      sessionId,
      req.ip,
      req.headers["user-agent"],
    )

    res.json({
      // `token` remains the access token for backward compatibility with the
      // existing frontend; new clients also receive a refresh token.
      token: accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TTL_SECONDS,
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

//! Exchange a refresh token for a new access token (with rotation)
router.post("/refresh", validate({ body: authSchemas.refresh }), async (req, res) => {
  try {
    const { refreshToken } = req.body

    const result = await findValidRefreshToken(refreshToken)
    if (!result) {
      return res.status(401).json({ error: "Invalid or expired refresh token" })
    }

    // Reuse of an already-rotated/revoked token suggests theft — revoke the
    // whole family for that user and force re-login.
    if (result.reused) {
      await RefreshToken.updateMany(
        { userId: result.doc.userId, revoked: false },
        { $set: { revoked: true, revokedAt: new Date() } },
      )
      return res.status(401).json({ error: "Session is no longer valid. Please log in again." })
    }

    const doc = result.doc
    const user = await User.findById(doc.userId).populate("organization", "name slug")
    if (!user) {
      return res.status(401).json({ error: "User not found" })
    }

    // Rotate the refresh token and mint a fresh access token
    const { raw: newRefreshToken } = await rotateRefreshToken(doc, req.ip, req.headers["user-agent"])
    const accessToken = signAccessToken({
      userId: user._id,
      role: user.role,
      organizationId: user.organization?._id || null,
      sessionId: doc.sessionId,
    })

    res.json({
      token: accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresIn: ACCESS_TTL_SECONDS,
    })
  } catch (err) {
    console.error("Error in refresh:", err)
    res.status(500).json({ error: "Server error" })
  }
})

//! Request password reset
router.post("/forgot-password", forgotPasswordLimiter, validate({ body: authSchemas.forgotPassword }), async (req, res) => {
  try {
    const { email } = req.body

    // Check if user exists
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: "User not found" })

    // Generate a strong mixed-character-class reset code (CSPRNG, case-sensitive)
    const resetToken = generateOtp(8)

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

// Reset password with token (same brute-force profile as OTP verification)
router.post("/reset-password", otpLimiter, otpAccountLimiter, validate({ body: authSchemas.resetPassword }), async (req, res) => {
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

    // Hash the new password (Argon2id)
    const hashedPassword = await hashPassword(newPassword)

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
    const { sessionId, refreshToken } = req.body
    const authHeader = req.headers.authorization

    // Revoke the presented refresh token so it can't be used after logout
    if (refreshToken) {
      try {
        await RefreshToken.updateOne(
          { tokenHash: hashToken(refreshToken) },
          { $set: { revoked: true, revokedAt: new Date() } },
        )
      } catch (e) {
        // best-effort
      }
    }

    if (!sessionId && !authHeader && !refreshToken) {
      return res.json({ success: true, message: "Logged out" })
    }

    // Try to get sessionId and userId from JWT (accept "Bearer X" or raw token)
    let sid = sessionId
    let userId = null
    if (authHeader) {
      try {
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim()
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (!sid) sid = decoded.sessionId
        userId = decoded.userId
      } catch (e) {
        // Token might be expired, that's ok
      }
    }

    // Also revoke any refresh tokens tied to this session
    if (sid) {
      try {
        await RefreshToken.updateMany(
          { sessionId: sid, revoked: false },
          { $set: { revoked: true, revokedAt: new Date() } },
        )
      } catch (e) {
        // best-effort
      }
    }

    const { logActivity, getActivityDescription } = require("../utils/activityTracker")
    
    // Try to find session by sessionId first, then by userId
    let session = null
    if (sid) {
      session = await UserSession.findOne({ sessionId: sid }).populate("userId", "username")
    }
    if (!session && userId) {
      // Find any active session for this user
      session = await UserSession.findOne({ 
        userId: userId, 
        status: { $in: ["online", "idle"] },
        logoutTime: null 
      }).populate("userId", "username")
    }
    
    if (session) {
      // End the session - mark as offline and set logout time
      session.status = "offline"
      session.logoutTime = new Date()
      
      // Calculate final session duration
      if (session.loginTime) {
        session.totalActiveTime = Math.floor((new Date() - session.loginTime) / 1000)
      }
      
      await session.save()
      
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

    res.json({ success: true, message: "Logged out successfully" })
  } catch (err) {
    console.error("Error in logout:", err)
    res.json({ success: true, message: "Logged out" })
  }
})

//! Heartbeat to keep session alive
const WorkLog = require("../models/WorkLog")
const auth = require("../middleware/auth")

//! Logout from ALL devices — revoke every refresh token + close every session
router.post("/logout-all", auth, async (req, res) => {
  try {
    const userId = req.user.userId

    await RefreshToken.updateMany(
      { userId, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } },
    )

    await UserSession.updateMany(
      { userId, logoutTime: null, status: { $in: ["online", "idle"] } },
      { $set: { logoutTime: new Date(), status: "offline" } },
    )

    res.json({ success: true, message: "Logged out from all devices" })
  } catch (err) {
    console.error("Error in logout-all:", err)
    res.status(500).json({ error: "Server error" })
  }
})

router.post("/heartbeat", auth, async (req, res) => {
  try {
    const userId = req.user.userId
    
    // Find the user's active session
    const session = await UserSession.findOne({
      userId: userId,
      status: { $in: ["online", "idle"] },
      logoutTime: null,
    })

    if (!session) {
      return res.status(404).json({ error: "No active session found" })
    }

    const now = new Date()
    const timeSinceLastActivity = Math.floor((now - session.lastActivity) / 1000) // in seconds

    // Update session
    session.lastActivity = now
    session.status = "online"
    
    // Update total active time (only if less than 2 minutes since last activity)
    if (timeSinceLastActivity < 120) {
      session.totalActiveTime = (session.totalActiveTime || 0) + timeSinceLastActivity
    }
    
    await session.save()

    // Update WorkLog for today
    const user = await User.findById(userId)
    if (user && user.organization) {
      const workLog = await WorkLog.getOrCreateToday(userId, user.organization)
      
      // Update active time (only if less than 2 minutes since last activity)
      if (timeSinceLastActivity < 120) {
        workLog.totalLoginTime = (workLog.totalLoginTime || 0) + timeSinceLastActivity
        workLog.activeTime = (workLog.activeTime || 0) + timeSinceLastActivity
      }
      
      await workLog.save()
    }

    res.json({ 
      success: true, 
      status: session.status,
      totalActiveTime: session.totalActiveTime,
    })
  } catch (err) {
    console.error("Error in heartbeat:", err)
    res.status(500).json({ error: "Failed to update heartbeat" })
  }
})

module.exports = router

