const crypto = require("crypto")

// Strong OTP / security-token generator (Bug-fix #2).
//
// Every email-delivered security token (login MFA code, password-reset code,
// share-access verification code) is generated here so they all share one
// cryptographically secure, mixed-character-class implementation. Previous
// generators used `crypto.randomBytes(3).toString("hex")` (lowercase hex only)
// or `Math.random()` (not cryptographically secure, digits only).
//
// The token contains all four classes — uppercase, lowercase, digit, special —
// and is guaranteed to include at least one of each. Validation everywhere is an
// exact (case-sensitive) string compare, so case is significant.
//
// Visually ambiguous characters (0/O, 1/l/I) are omitted: these codes are read
// from an email and typed back by a human, so removing look-alikes cuts failed
// entries without weakening the character-class requirement.

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ" // no I, O
const LOWER = "abcdefghijkmnpqrstuvwxyz" // no l, o
const DIGITS = "23456789" // no 0, 1
// HTML- and form-safe specials (avoid &, <, >, ", ' so email HTML never breaks;
// the share code is additionally URL-encoded when placed in a query string).
const SPECIAL = "!@#$%^*?"
const ALL = UPPER + LOWER + DIGITS + SPECIAL

// Pick one cryptographically-random character from a set.
const pick = (set) => set[crypto.randomInt(set.length)]

/**
 * Generate a strong OTP/token.
 * @param {number} length total length (min 4 so every class fits). Default 8.
 * @returns {string} e.g. "T#7mP!2x"
 */
function generateOtp(length = 8) {
  const len = Math.max(4, length)

  // Guarantee at least one character from each class.
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)]

  // Fill the remainder from the full pool.
  for (let i = chars.length; i < len; i++) {
    chars.push(pick(ALL))
  }

  // Fisher-Yates shuffle with a CSPRNG so the guaranteed characters aren't in
  // fixed positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join("")
}

module.exports = { generateOtp }
