/**
 * One-time migration: re-encrypt every stored file under the NEW master key,
 * upgrading legacy AES-256-CBC files to AES-256-GCM in the same pass.
 *
 * Why: the old ENCRYPTION_KEY was exposed in public git history (2026-06).
 * Rotating the key alone would leave existing files undecryptable, so this
 * script decrypts each file with the OLD key and re-encrypts with the NEW one.
 *
 * Requires env:
 *   MONGO_URI           - database connection
 *   ENCRYPTION_KEY      - the NEW key (already in .env)
 *   ENCRYPTION_KEY_OLD  - the OLD key (temporary; delete from .env afterwards)
 *
 * Run INSIDE the backend container (it has the uploads volume + DB access):
 *   docker compose exec backend node src/scripts/rotateEncryption.js
 *
 * Safety:
 *  - per-file .bak copy of the original encrypted blob; deleted only after the
 *    DB update succeeds (crash mid-file leaves a recoverable .bak)
 *  - files that fail OLD-key decryption (e.g. already migrated / uploaded
 *    after the rotation) are skipped and reported, never modified
 */

require("dotenv").config()

const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const mongoose = require("mongoose")

const NEW_KEY = process.env.ENCRYPTION_KEY
const OLD_KEY = process.env.ENCRYPTION_KEY_OLD

if (!NEW_KEY || !OLD_KEY) {
  console.error("Both ENCRYPTION_KEY (new) and ENCRYPTION_KEY_OLD must be set.")
  process.exit(1)
}

// encryption.js reads ENCRYPTION_KEY from the environment at call time, so we
// flip it between the decrypt (old key) and encrypt (new key) phases.
const { decryptFile, encryptFile } = require("../utils/encryption")
const File = require("../models/File")

const UPLOADS_DIR = path.join(__dirname, "../uploads")

const resolveExistingPath = (storedPath) => {
  if (storedPath && fs.existsSync(storedPath)) return storedPath
  if (storedPath) {
    const fallback = path.join(UPLOADS_DIR, path.basename(storedPath))
    if (fs.existsSync(fallback)) return fallback
  }
  return null
}

const sha256OfFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256")
    fs.createReadStream(filePath)
      .on("data", (c) => hash.update(c))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject)
  })

const migrateOne = async (file) => {
  const encPath = resolveExistingPath(file.filePath)
  if (!encPath) return { status: "missing" }

  const tmpPlain = encPath + ".rotate.plain"
  const tmpNew = encPath + ".rotate.new"
  const bak = encPath + ".bak"

  try {
    // 1. Decrypt with the OLD key (per-file algorithm; legacy files are CBC)
    process.env.ENCRYPTION_KEY = OLD_KEY
    await decryptFile(encPath, tmpPlain, {
      algorithm: file.encryptionAlgorithm,
      authTag: file.encryptionAuthTag,
    })

    // 2. Re-encrypt with the NEW key (always GCM). encryptFile deletes its
    //    input (tmpPlain) after encrypting — exactly what we want.
    process.env.ENCRYPTION_KEY = NEW_KEY
    const meta = await encryptFile(tmpPlain, tmpNew)

    // 3. Swap files: keep a .bak of the old blob until the DB row is updated
    fs.copyFileSync(encPath, bak)
    fs.renameSync(tmpNew, encPath)

    // 4. Update the document (hash is computed over the ENCRYPTED file)
    const newHash = await sha256OfFile(encPath)
    await File.updateOne(
      { _id: file._id },
      {
        $set: {
          filePath: encPath,
          encryptionIv: meta.iv,
          encryptionAlgorithm: meta.algorithm,
          encryptionAuthTag: meta.authTag,
          fileHash: newHash,
          hashAlgorithm: "sha256",
          integrityVerified: true,
          lastIntegrityCheck: new Date(),
        },
      },
    )

    fs.unlinkSync(bak)
    return { status: "migrated" }
  } catch (err) {
    // Clean up partial artifacts; the original encrypted blob is untouched
    for (const p of [tmpPlain, tmpNew]) {
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
    return { status: "failed", error: err.message }
  } finally {
    process.env.ENCRYPTION_KEY = NEW_KEY
  }
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI)
  console.log("Connected. Scanning files…")

  const files = await File.find({}).select(
    "fileName filePath encryptionAlgorithm encryptionAuthTag fileHash",
  )
  console.log(`${files.length} file document(s) found.`)

  const totals = { migrated: 0, missing: 0, failed: 0 }
  for (const file of files) {
    const res = await migrateOne(file)
    totals[res.status] += 1
    const note = res.error ? ` — ${res.error}` : ""
    console.log(`[${res.status}] ${file.fileName}${note}`)
  }

  console.log(
    `\nDone. migrated=${totals.migrated} missing=${totals.missing} failed=${totals.failed}`,
  )
  console.log(
    totals.failed === 0
      ? "All reachable files re-encrypted. You can now remove ENCRYPTION_KEY_OLD from .env."
      : "Some files failed — investigate before removing ENCRYPTION_KEY_OLD.",
  )
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
