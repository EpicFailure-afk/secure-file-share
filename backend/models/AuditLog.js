const mongoose = require("mongoose")
const crypto = require("crypto")
const metrics = require("../utils/metrics")

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  action: {
    type: String,
    required: true,
    enum: [
      "user_login",
      "user_logout",
      "user_register",
      "user_update",
      "user_delete",
      "user_deactivate",
      "user_activate",
      "file_upload",
      "file_download",
      "file_delete",
      "file_share",
      "file_revoke",
      "file_access",
      "file_lock",
      "file_unlock",
      "file_scan",
      "file_integrity_check",
      "admin_action",
      "system_cleanup",
      "organization_created",
      "organization_deleted",
      "organization_settings_updated",
      "ownership_transferred",
      "user_joined_organization",
      "user_left_organization",
      "member_approved",
      "member_rejected",
      "member_role_updated",
      "member_removed",
    ],
  },
  targetType: {
    type: String,
    enum: ["user", "file", "system", "organization"],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ["success", "failure", "pending"],
    default: "success",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // ---- Tamper-evident hash chain (Operation Red Zone Phase 6) ----
  // Each chained entry stores its position, the hash of the previous chained
  // entry, and its own hash over its canonical content + prevHash. Any deletion
  // or in-place edit of a row breaks the chain at that point and is detectable
  // via the verify routine below. Rows created before Phase 6 have null seq/hash
  // and sit outside the chain (the first chained row links to "GENESIS").
  seq: {
    type: Number,
    default: null,
  },
  prevHash: {
    type: String,
    default: null,
  },
  hash: {
    type: String,
    default: null,
  },
})

// Index for efficient querying
auditLogSchema.index({ timestamp: -1 })
auditLogSchema.index({ userId: 1, timestamp: -1 })
auditLogSchema.index({ action: 1, timestamp: -1 })
auditLogSchema.index({ targetType: 1, targetId: 1 })
auditLogSchema.index({ seq: 1 })

// Canonical, deterministic serialization of the tamper-evident content of an
// entry. _id and hash itself are intentionally excluded; prevHash is included so
// reordering or splicing the chain changes the hash.
function canonicalPayload(doc) {
  return JSON.stringify({
    seq: doc.seq,
    userId: doc.userId ? String(doc.userId) : null,
    action: doc.action,
    targetType: doc.targetType,
    targetId: doc.targetId ? String(doc.targetId) : null,
    details: doc.details ?? {},
    ipAddress: doc.ipAddress ?? null,
    userAgent: doc.userAgent ?? null,
    status: doc.status,
    timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : null,
    prevHash: doc.prevHash,
  })
}

function computeHash(doc) {
  return crypto.createHash("sha256").update(canonicalPayload(doc)).digest("hex")
}

// Serialization lock. The chain head (seq + hash of the last persisted entry)
// must be read, used, and persisted without another write interleaving — a race
// would assign duplicate seq numbers or fork the chain. We therefore hold a
// single in-process lock from each entry's pre-save through its post-save, so
// the next entry's head lookup always reflects the now-persisted previous entry.
//
// Honest limitation: this guarantees integrity within a single backend process.
// A multi-instance deployment would need a DB-side sequence/lock; documented as
// a known constraint for this graduation project (single backend container).
let chainLock = Promise.resolve()

auditLogSchema.pre("save", function (next) {
  // Only chain on first insert; never re-chain an already-hashed/updated doc.
  if (!this.isNew || this.hash) return next()

  const previous = chainLock
  let releaseLock
  chainLock = new Promise((resolve) => {
    releaseLock = resolve
  })
  this._releaseChainLock = releaseLock

  previous
    .then(async () => {
      const head = await mongoose
        .model("AuditLog")
        .findOne({ seq: { $ne: null } })
        .sort({ seq: -1 })
        .select("seq hash")
        .lean()

      this.seq = head && typeof head.seq === "number" ? head.seq + 1 : 1
      this.prevHash = head && head.hash ? head.hash : "GENESIS"
      this.hash = computeHash(this)
      next()
    })
    .catch((err) => {
      // Release the lock so a single failed chain computation doesn't deadlock
      // every subsequent audit write, then surface the error.
      if (this._releaseChainLock) {
        this._releaseChainLock()
        this._releaseChainLock = null
      }
      next(err)
    })
})

// Release the lock only once the entry is durably persisted (or the save
// errored), so the next entry reads the correct, committed chain head.
function releaseChainLock(doc) {
  if (doc && doc._releaseChainLock) {
    doc._releaseChainLock()
    doc._releaseChainLock = null
  }
}

auditLogSchema.post("save", function () {
  releaseChainLock(this)
  if (this.seq) metrics.inc("audit_writes_total")
})

// Error-handling post hook (4-arg signature) — runs when save() rejects.
// eslint-disable-next-line no-unused-vars
auditLogSchema.post("save", function (err, doc, next) {
  releaseChainLock(doc)
  next(err)
})

// Walk the chain in order and confirm every entry's stored hash matches a fresh
// recompute and that prevHash links to the prior entry. Returns a structured
// report so an admin endpoint / script can prove integrity (or pinpoint the
// first broken link). Only chained entries (seq != null) are considered.
auditLogSchema.statics.verifyChain = async function () {
  const entries = await this.find({ seq: { $ne: null } })
    .sort({ seq: 1 })
    .lean()

  let expectedPrev = "GENESIS"
  let expectedSeq = 1
  for (const entry of entries) {
    if (entry.seq !== expectedSeq) {
      return {
        valid: false,
        checked: expectedSeq - 1,
        total: entries.length,
        brokenAt: entry.seq,
        reason: `sequence gap: expected ${expectedSeq}, found ${entry.seq}`,
      }
    }
    if (entry.prevHash !== expectedPrev) {
      return {
        valid: false,
        checked: expectedSeq - 1,
        total: entries.length,
        brokenAt: entry.seq,
        reason: "prevHash does not link to previous entry (deletion/reorder)",
      }
    }
    const recomputed = computeHash(entry)
    if (entry.hash !== recomputed) {
      return {
        valid: false,
        checked: expectedSeq - 1,
        total: entries.length,
        brokenAt: entry.seq,
        reason: "content hash mismatch (entry was modified)",
      }
    }
    expectedPrev = entry.hash
    expectedSeq += 1
  }

  return { valid: true, checked: entries.length, total: entries.length }
}

module.exports = mongoose.model("AuditLog", auditLogSchema)
