const mongoose = require("mongoose")

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    enum: ["security", "storage", "scanning", "general"],
    default: "general",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
})

// Default settings
const defaultSettings = [
  { key: "max_file_size", value: 10485760, description: "Maximum file size in bytes (10MB)", category: "storage" },
  { key: "default_expiry_days", value: 30, description: "Default file expiry in days", category: "storage" },
  { key: "virus_scan_enabled", value: true, description: "Enable virus scanning", category: "scanning" },
  { key: "auto_delete_infected", value: false, description: "Automatically delete infected files", category: "scanning" },
  { key: "integrity_check_interval", value: 86400, description: "Integrity check interval in seconds (24 hours)", category: "security" },
  { key: "max_login_attempts", value: 5, description: "Maximum login attempts before lockout", category: "security" },
  { key: "session_timeout", value: 3600, description: "Session timeout in seconds (1 hour)", category: "security" },
  { key: "maintenance_mode", value: false, description: "Enable maintenance mode", category: "general" },
]

// Static method to initialize default settings
systemSettingsSchema.statics.initializeDefaults = async function () {
  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true, new: true }
    )
  }
}

// Static method to get setting value
systemSettingsSchema.statics.getSetting = async function (key) {
  const setting = await this.findOne({ key })
  return setting ? setting.value : null
}

// Static method to update setting
systemSettingsSchema.statics.updateSetting = async function (key, value, userId) {
  return this.findOneAndUpdate(
    { key },
    { value, updatedAt: new Date(), updatedBy: userId },
    { new: true }
  )
}

module.exports = mongoose.model("SystemSettings", systemSettingsSchema)
