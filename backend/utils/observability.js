const logger = require("./logger")

// Optional error tracking (Operation Red Zone Phase 6).
//
// Sentry is an *optional* integration: it activates only when SENTRY_DSN is set
// AND the @sentry/node package is installed. This keeps the dependency out of the
// default image (no forced install) while making production error tracking a
// one-line opt-in. When inactive, every export is a safe no-op so server.js can
// call them unconditionally.

let Sentry = null
let enabled = false

function initObservability() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    logger.info("observability_sentry_disabled", { reason: "no SENTRY_DSN" })
    return { enabled: false }
  }
  try {
    // Optional require — absent in the default install; present once added.
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    Sentry = require("@sentry/node")
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    })
    enabled = true
    logger.info("observability_sentry_enabled", {})
  } catch {
    logger.warn("observability_sentry_unavailable", {
      reason: "@sentry/node not installed; run `npm i @sentry/node` to enable",
    })
  }
  return { enabled }
}

// Capture an exception if Sentry is active; otherwise no-op.
function captureException(err, context) {
  if (enabled && Sentry) {
    Sentry.captureException(err, context ? { extra: context } : undefined)
  }
}

module.exports = { initObservability, captureException, isEnabled: () => enabled }
