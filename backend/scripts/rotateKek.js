/**
 * Rotate the master Key Encryption Key (KEK).
 *
 * Thanks to envelope encryption this is cheap: each file's blob stays as-is; we
 * only unwrap its tiny Data Encryption Key (DEK) with the KEK version it was
 * wrapped under and re-wrap it with the new ACTIVE KEK. No file blob is ever
 * re-encrypted.
 *
 * Usage:
 *   1. Add a new KEK version to the keyring and make it active, e.g.:
 *        KEK_KEYRING='{"v1":"<old hex>","v2":"<new hex>"}'
 *        KEK_ACTIVE_VERSION=v2
 *      (or update the mounted KEK_KEYRING_FILE).
 *   2. Run inside the backend container:
 *        docker compose exec backend node src/scripts/rotateKek.js
 *
 * The old KEK version MUST remain in the keyring until every file has been
 * re-wrapped (the script needs it to unwrap). After a successful run, files are
 * all on the new version and the old one can be retired.
 */

require("dotenv").config()
const mongoose = require("mongoose")
const keyVault = require("../utils/keyVault")
const File = require("../models/File")

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI)
  const { version: activeVersion } = keyVault.getActiveKek()
  console.log(`Active KEK version: ${activeVersion}`)

  // Only envelope files that aren't already on the active version need rewrapping.
  const files = await File.find({
    dekWrapped: { $ne: null },
    kekVersion: { $ne: activeVersion },
  }).select("fileName dekWrapped dekWrapIv dekWrapTag kekVersion")

  console.log(`${files.length} file(s) to re-wrap.`)
  const totals = { rewrapped: 0, failed: 0 }

  for (const file of files) {
    try {
      const dek = keyVault.unwrapDek({
        wrapped: file.dekWrapped,
        iv: file.dekWrapIv,
        tag: file.dekWrapTag,
        version: file.kekVersion,
      })
      const w = keyVault.wrapDek(dek) // wraps under the active version
      await File.updateOne(
        { _id: file._id },
        { $set: { dekWrapped: w.wrapped, dekWrapIv: w.iv, dekWrapTag: w.tag, kekVersion: w.version } },
      )
      totals.rewrapped += 1
      console.log(`[rewrapped] ${file.fileName} (${file.kekVersion} -> ${w.version})`)
    } catch (err) {
      totals.failed += 1
      console.error(`[failed] ${file.fileName}: ${err.message}`)
    }
  }

  const legacyCount = await File.countDocuments({ dekWrapped: null })
  console.log(`\nDone. rewrapped=${totals.rewrapped} failed=${totals.failed}`)
  if (legacyCount > 0) {
    console.log(
      `Note: ${legacyCount} legacy file(s) have no wrapped DEK (encrypted directly with the ` +
        `master key) and are unaffected by KEK rotation.`,
    )
  }
  console.log(
    totals.failed === 0
      ? "All envelope files are now on the active KEK version. The previous version can be retired."
      : "Some files failed — keep the previous KEK version until they are resolved.",
  )
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error("KEK rotation failed:", err)
  process.exit(1)
})
