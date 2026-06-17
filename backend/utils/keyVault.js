const crypto = require("crypto")
const fs = require("fs")

// Key vault for envelope encryption.
//
// Each file is encrypted with its own random 256-bit Data Encryption Key (DEK).
// The DEK is then WRAPPED (encrypted) with a master Key Encryption Key (KEK)
// drawn from a *versioned* keyring, and only the wrapped DEK + KEK version are
// stored on the File document. This gives two properties the single-master-key
// design could not:
//   - True crypto-erase: destroying a file's wrapped DEK makes its ciphertext
//     permanently unrecoverable, even from blob backups.
//   - Cheap rotation: rotating the master key re-wraps the tiny DEKs only — the
//     (potentially huge) file blobs are never re-encrypted.
//
// The KEK keyring is loaded, in priority order, from:
//   1. KEK_KEYRING_FILE  — path to a mounted JSON secret
//        { "activeVersion": "v2", "keys": { "v1": "<hex>", "v2": "<hex>" } }
//   2. KEK_KEYRING (env, same JSON) + KEK_ACTIVE_VERSION
//   3. ENCRYPTION_KEY     — used as version "v1" (zero-config fallback / legacy)
//
// This keeps the master key out of the application code and lets a deployment
// point at a real secret store (mounted file) without code changes.

const WRAP_IV_LENGTH = 12 // GCM

// Normalize raw key material to a 32-byte buffer (same scheme encryption.js used
// for the legacy master key, so version "v1" derived from ENCRYPTION_KEY matches
// the key legacy files were encrypted under).
const deriveKeyMaterial = (raw) => {
  if (raw && raw.length === 64 && /^[0-9a-f]+$/i.test(raw)) {
    return Buffer.from(raw, "hex")
  }
  return crypto.createHash("sha256").update(String(raw)).digest()
}

let keyring = null // { activeVersion, keys: { [version]: Buffer } }

const loadKeyring = () => {
  if (keyring) return keyring

  // 1. Mounted secret file
  if (process.env.KEK_KEYRING_FILE && fs.existsSync(process.env.KEK_KEYRING_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(process.env.KEK_KEYRING_FILE, "utf8"))
    keyring = {
      activeVersion: parsed.activeVersion,
      keys: Object.fromEntries(
        Object.entries(parsed.keys).map(([v, hex]) => [v, deriveKeyMaterial(hex)]),
      ),
    }
  } else if (process.env.KEK_KEYRING) {
    // 2. env JSON keyring
    const parsed = JSON.parse(process.env.KEK_KEYRING)
    const versions = Object.keys(parsed)
    keyring = {
      activeVersion: process.env.KEK_ACTIVE_VERSION || versions[versions.length - 1],
      keys: Object.fromEntries(versions.map((v) => [v, deriveKeyMaterial(parsed[v])])),
    }
  } else if (process.env.ENCRYPTION_KEY) {
    // 3. Zero-config fallback: the existing master key becomes v1
    keyring = { activeVersion: "v1", keys: { v1: deriveKeyMaterial(process.env.ENCRYPTION_KEY) } }
  } else {
    throw new Error(
      "No key material: set KEK_KEYRING_FILE, KEK_KEYRING, or ENCRYPTION_KEY. Refusing to start.",
    )
  }

  if (!keyring.activeVersion || !keyring.keys[keyring.activeVersion]) {
    throw new Error("Key vault: active KEK version is missing from the keyring")
  }
  return keyring
}

const getActiveKek = () => {
  const kr = loadKeyring()
  return { version: kr.activeVersion, key: kr.keys[kr.activeVersion] }
}

const getKek = (version) => {
  const kr = loadKeyring()
  const key = kr.keys[version]
  if (!key) throw new Error(`Key vault: unknown KEK version "${version}"`)
  return key
}

// The legacy master key (== KEK v1 derivation). Used to decrypt pre-envelope
// files that were encrypted directly with the master key (no wrapped DEK).
const getLegacyMasterKey = () => deriveKeyMaterial(process.env.ENCRYPTION_KEY)

const generateDek = () => crypto.randomBytes(32)

// Wrap a DEK under the ACTIVE KEK. Returns hex fields for storage.
const wrapDek = (dek) => {
  const { version, key } = getActiveKek()
  const iv = crypto.randomBytes(WRAP_IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const wrapped = Buffer.concat([cipher.update(dek), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    wrapped: wrapped.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    version,
  }
}

// Unwrap a stored DEK using the KEK version it was wrapped under.
const unwrapDek = ({ wrapped, iv, tag, version }) => {
  const key = getKek(version)
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"))
  decipher.setAuthTag(Buffer.from(tag, "hex"))
  return Buffer.concat([decipher.update(Buffer.from(wrapped, "hex")), decipher.final()])
}

// Resolve the FILE-encryption key for a given File document:
//   - envelope files (have a wrapped DEK) → unwrap the DEK
//   - legacy files (no wrapped DEK) → the legacy master key
const resolveFileKey = (file) => {
  if (file.dekWrapped && file.dekWrapIv && file.dekWrapTag && file.kekVersion) {
    return unwrapDek({
      wrapped: file.dekWrapped,
      iv: file.dekWrapIv,
      tag: file.dekWrapTag,
      version: file.kekVersion,
    })
  }
  return getLegacyMasterKey()
}

// Validate configuration at startup (fail fast).
const init = () => {
  const { version } = getActiveKek()
  console.log(`Key vault: active KEK version "${version}" (${Object.keys(loadKeyring().keys).length} version(s))`)
}

module.exports = {
  init,
  getActiveKek,
  getKek,
  generateDek,
  wrapDek,
  unwrapDek,
  resolveFileKey,
  getLegacyMasterKey,
  deriveKeyMaterial,
}
