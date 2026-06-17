const mongoose = require("mongoose")

// Server-side record of issued refresh tokens, so sessions are revocable
// (logout, logout-all, rotation). Only the SHA-256 hash of the token is stored
// — the raw token lives only on the client — so a database leak cannot be used
// to mint access tokens.
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // SHA-256 hex of the raw refresh token
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    // Links the refresh token to the UserSession created at login
    sessionId: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    // On rotation, points to the tokenHash that replaced this one (audit trail
    // + reuse detection).
    replacedByHash: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
)

// TTL index — Mongo removes expired token records automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model("RefreshToken", refreshTokenSchema)
