const express = require("express");
const User = require("../models/User"); // Import the User model
const authMiddleware = require("../middleware/auth"); // Import auth middleware

const router = express.Router();

// Get user details (protected route)
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password"); // Exclude password
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
