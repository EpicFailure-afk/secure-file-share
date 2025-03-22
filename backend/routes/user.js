const express = require("express")
const bcrypt = require("bcryptjs")
const User = require("../models/User") // Import the User model
const authMiddleware = require("../middleware/auth") // Import auth middleware

const router = express.Router()

// Get user details (protected route)
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password") // Exclude password
    if (!user) return res.status(404).json({ message: "User not found" })

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    res.status(500).json({ message: "Server error" })
  }
})

// Update user profile (protected route)
router.put("/update-profile", authMiddleware, async (req, res) => {
  try {
    const { username } = req.body

    // Validate input
    if (!username) {
      return res.status(400).json({ error: "Username is required" })
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({
      username,
      _id: { $ne: req.user.userId },
    })

    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" })
    }

    // Update user
    const user = await User.findByIdAndUpdate(req.user.userId, { username }, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error("Update profile error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

// Update user password (protected route)
router.put("/update-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required" })
    }

    // Get user with password
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password
    user.password = hashedPassword
    await user.save()

    res.json({ message: "Password updated successfully" })
  } catch (err) {
    console.error("Update password error:", err)
    res.status(500).json({ error: "Server error" })
  }
})

module.exports = router

