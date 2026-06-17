#!/usr/bin/env node
/**
 * Bootstrap script to grant a user the platform superadmin role.
 *
 * Superadmin is the single platform-level security authority. It can normally
 * only be assigned by another superadmin (via the admin API); this script is
 * the out-of-band bootstrap for the very first superadmin, run by a server
 * operator with direct database access.
 *
 * Usage: node src/scripts/makeSuperadmin.js <email>
 */

const mongoose = require("mongoose")
require("dotenv").config()

// Minimal User model for this script.
const User = mongoose.model("User", new mongoose.Schema({ email: String, role: String }, { strict: false }))

async function makeSuperadmin(email) {
  if (!email) {
    console.error("Usage: node src/scripts/makeSuperadmin.js <email>")
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("Connected to MongoDB")

    const user = await User.findOneAndUpdate(
      { email },
      { role: "superadmin" },
      { new: true },
    )

    if (!user) {
      console.error(`User with email "${email}" not found`)
      process.exit(1)
    }

    console.log(`Successfully made ${email} a superadmin!`)
    console.log("User:", { _id: user._id, email: user.email, role: user.role })
  } catch (error) {
    console.error("Error:", error.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

makeSuperadmin(process.argv[2])
