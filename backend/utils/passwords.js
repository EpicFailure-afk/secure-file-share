const argon2 = require("@node-rs/argon2")
const bcrypt = require("bcryptjs")

// Password hashing. New hashes use Argon2id (memory-hard, the current OWASP
// recommendation). Existing accounts were hashed with bcrypt, so verification
// transparently supports both and callers can lazily re-hash to Argon2id on the
// next successful login (see needsRehash).

// Argon2id parameters — sensible interactive defaults (~19 MiB, 2 passes).
const ARGON2_OPTS = {
  algorithm: argon2.Algorithm.Argon2id,
  memoryCost: 19456, // KiB
  timeCost: 2,
  parallelism: 1,
}

const hashPassword = (plain) => argon2.hash(plain, ARGON2_OPTS)

// Verifies a plaintext password against either an Argon2 or a bcrypt hash.
const verifyPassword = async (plain, hash) => {
  if (!hash) return false
  if (hash.startsWith("$argon2")) {
    try {
      return await argon2.verify(hash, plain)
    } catch {
      return false
    }
  }
  // Legacy bcrypt hashes ($2a$ / $2b$ / $2y$)
  return bcrypt.compare(plain, hash)
}

// True if the stored hash should be upgraded to the current Argon2id scheme.
const needsRehash = (hash) => !hash || !hash.startsWith("$argon2")

module.exports = { hashPassword, verifyPassword, needsRehash }
