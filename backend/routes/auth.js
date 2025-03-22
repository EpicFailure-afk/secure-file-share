const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const Token = require("../models/Token")
const { sendVerificationEmail } = require("../utils/email")

const router = express.Router()

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) return res.status(400).json({ message: "User already exists" })

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = new User({ username, email, password: hashedPassword })
    await newUser.save()

    res.status(201).json({ message: "User registered successfully" })
  } catch (err) {
    console.error("Error in register:", err)
    res.status(500).json({ message: "Server error" })
  }
})

// Request login token (step 1 of 2-step login)
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

// Verify login token (step 2 of 2-step login)
router.post("/verify-token", async (req, res) => {
  try {
    const { email, token } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: "User not found" })

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

    // Generate JWT token
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    })

    res.json({ token: jwtToken, message: "Login successful" })
  } catch (err) {
    console.error("Error in verify-token:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Request password reset
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

module.exports = router

