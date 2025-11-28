#!/usr/bin/env node
/**
 * Script to make a user an admin
 * Usage: node scripts/makeAdmin.js <email>
 */

const mongoose = require("mongoose")
require("dotenv").config()

// Simple User model for this script
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
})

const User = mongoose.model("User", userSchema)

async function makeAdmin(email) {
  if (!email) {
    console.error("Usage: node scripts/makeAdmin.js <email>")
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("Connected to MongoDB")

    const user = await User.findOneAndUpdate(
      { email: email },
      { role: "admin" },
      { new: true }
    )

    if (!user) {
      console.error(`User with email "${email}" not found`)
      process.exit(1)
    }

    console.log(`Successfully made ${email} an admin!`)
    console.log("User:", user)
  } catch (error) {
    console.error("Error:", error.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

const email = process.argv[2]
makeAdmin(email)
