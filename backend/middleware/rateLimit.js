const { rateLimit, ipKeyGenerator } = require("express-rate-limit")

// Rate limiters for authentication endpoints. Login and the emailed OTP are
// otherwise brute-forceable (the OTP is only 6 hex chars ≈ 16.7M combinations,
// and previously had UNLIMITED verify attempts).
//
// Two dimensions:
//  - per-IP (the limiter default) to slow distributed guessing from one host
//  - per-account (keyed by normalized email) so an attacker can't rotate IPs
//    against a single account unhindered
//
// NOTE: stores are in-memory for now — fine for a single backend container.
// When the app scales horizontally, switch to a shared store (e.g. Redis).

const emailKey = (req) =>
  typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : ipKeyGenerator(req.ip) // IPv6-safe fallback when no email is supplied

// Step 1 of login (password check + OTP email send).
// Limits both password guessing and OTP-email spam.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
})

const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10, // per account
  keyGenerator: emailKey,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts for this account. Please try again in 15 minutes." },
})

// Step 2 of login (OTP verification). The OTP expires after 10 minutes, so
// 10 guesses per window makes brute-forcing the 6-hex-char code infeasible.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes (matches OTP lifetime)
  limit: 10, // per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please request a new code." },
})

const otpAccountLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10, // per account
  keyGenerator: emailKey,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many verification attempts for this account. Please request a new code." },
})

// Password reset request + reset submission share the same abuse profile
// as login/OTP respectively.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again later." },
})

module.exports = {
  loginLimiter,
  loginAccountLimiter,
  otpLimiter,
  otpAccountLimiter,
  forgotPasswordLimiter,
}
