const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const RefreshToken = require("../models/RefreshToken")

// Short-lived access token + long-lived, revocable refresh token. This replaces
// the previous single 8-hour JWT: access tokens now expire quickly so a leaked
// token is useful only briefly, and the refresh token (tracked server-side) can
// be revoked at any time (logout / logout-all / rotation), giving continuous
// re-verification rather than one long-lived grant.

const ACCESS_TTL_SECONDS = 30 * 60 // 30 minutes
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL_SECONDS })

const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex")

// Creates and persists a new refresh token; returns the RAW token (only ever
// returned to the client) and its expiry.
const issueRefreshToken = async (userId, sessionId, ipAddress, userAgent) => {
  const raw = crypto.randomBytes(48).toString("hex")
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(raw),
    sessionId: sessionId || null,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  })
  return { raw, expiresAt }
}

// Looks up a usable (not revoked, not expired) refresh token record by raw value.
const findValidRefreshToken = async (raw) => {
  if (!raw || typeof raw !== "string") return null
  const doc = await RefreshToken.findOne({ tokenHash: hashToken(raw) })
  if (!doc) return null
  if (doc.revoked) return { reused: true, doc }
  if (doc.expiresAt <= new Date()) return null
  return { reused: false, doc }
}

// Rotates a refresh token: revokes the old record and issues a fresh one,
// preserving the session link. Returns the new raw token + expiry.
const rotateRefreshToken = async (oldDoc, ipAddress, userAgent) => {
  const raw = crypto.randomBytes(48).toString("hex")
  const newHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)

  await RefreshToken.create({
    userId: oldDoc.userId,
    tokenHash: newHash,
    sessionId: oldDoc.sessionId,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  })

  oldDoc.revoked = true
  oldDoc.revokedAt = new Date()
  oldDoc.replacedByHash = newHash
  await oldDoc.save()

  return { raw, expiresAt }
}

module.exports = {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_MS,
  signAccessToken,
  hashToken,
  issueRefreshToken,
  findValidRefreshToken,
  rotateRefreshToken,
}
