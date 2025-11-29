#!/usr/bin/env node
/**
 * Script to make a user an admin or superadmin
 * Usage: node scripts/makeAdmin.js <email> [role]
 * Roles: admin, superadmin (default: superadmin)
 */

const mongoose = require("mongoose")
require("dotenv").config()

// Simple User model for this script
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
})

const User = mongoose.model("User", userSchema)

async function makeAdmin(email, role = "superadmin") {
  if (!email) {
    console.error("Usage: node scripts/makeAdmin.js <email> [role]")
    console.error("Roles: admin, superadmin (default: superadmin)")
    process.exit(1)
  }

  if (!["admin", "superadmin"].includes(role)) {
    console.error("Invalid role. Must be 'admin' or 'superadmin'")
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("Connected to MongoDB")

    const user = await User.findOneAndUpdate(
      { email: email },
      { role: role },
      { new: true }
    )

    if (!user) {
      console.error(`User with email "${email}" not found`)
      process.exit(1)
    }

    console.log(`Successfully made ${email} a ${role}!`)
    console.log("User:", user)
  } catch (error) {
    console.error("Error:", error.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

const email = process.argv[2]
const role = process.argv[3] || "superadmin"
makeAdmin(email, role)
