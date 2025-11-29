const mongoose = require("mongoose")
const crypto = require("crypto")

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    industry: {
      type: String,
      enum: ["technology", "healthcare", "finance", "education", "government", "retail", "manufacturing", "other"],
      default: "other",
    },
    logo: {
      type: String,
      default: null,
    },
    // Organization owner (super admin)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Invite code for joining
    inviteCode: {
      type: String,
      unique: true,
    },
    inviteCodeExpires: {
      type: Date,
      default: null,
    },
    // Settings
    settings: {
      maxUsers: {
        type: Number,
        default: 50,
      },
      maxStoragePerUser: {
        type: Number,
        default: 5368709120, // 5GB per user
      },
      totalStorageLimit: {
        type: Number,
        default: 107374182400, // 100GB total
      },
      allowedFileTypes: {
        type: [String],
        default: [], // Empty = all types allowed
      },
      maxFileSize: {
        type: Number,
        default: 524288000, // 500MB
      },
      requireApprovalForNewUsers: {
        type: Boolean,
        default: false,
      },
      enableAuditLog: {
        type: Boolean,
        default: true,
      },
      enableVirusScanning: {
        type: Boolean,
        default: true,
      },
      defaultFileExpiration: {
        type: Number,
        default: 0, // 0 = no expiration
      },
    },
    // Statistics
    stats: {
      totalUsers: {
        type: Number,
        default: 1, // Owner counts
      },
      totalFiles: {
        type: Number,
        default: 0,
      },
      totalStorage: {
        type: Number,
        default: 0,
      },
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "starter", "professional", "enterprise"],
        default: "free",
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
)

// Generate slug from name
organizationSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    // Add random suffix to ensure uniqueness
    if (this.isNew) {
      this.slug += "-" + crypto.randomBytes(3).toString("hex")
    }
  }
  next()
})

// Generate alphanumeric invite code (uppercase + lowercase + numbers)
const generateAlphanumericCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let code = ""
  const randomBytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length]
  }
  return code
}

// Generate invite code
organizationSchema.methods.generateInviteCode = function (expiresInHours = 72) {
  this.inviteCode = generateAlphanumericCode(8)
  this.inviteCodeExpires = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
  return this.inviteCode
}

// Validate invite code (case-sensitive for alphanumeric codes)
organizationSchema.methods.isInviteCodeValid = function (code) {
  if (!this.inviteCode || !this.inviteCodeExpires) return false
  if (this.inviteCode !== code) return false
  if (new Date() > this.inviteCodeExpires) return false
  return true
}

// Check if organization can add more users
organizationSchema.methods.canAddUser = function () {
  return this.stats.totalUsers < this.settings.maxUsers
}

module.exports = mongoose.model("Organization", organizationSchema)
