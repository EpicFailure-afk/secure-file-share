const crypto = require("crypto")
const logger = require("../utils/logger")
const { captureException } = require("../utils/observability")

// Assigns a correlation ID to every request and echoes it back as a response
// header. The ID ties a client-visible error to the full server-side log entry
// without leaking any internal detail, and is the hook Phase 6 (forensic
// logging) will thread through structured logs.
const requestId = (req, res, next) => {
  // Honor an upstream id (e.g. from nginx/Cloudflare) if present, else mint one
  const incoming = req.headers["x-request-id"]
  req.id = typeof incoming === "string" && incoming.length <= 200 ? incoming : crypto.randomUUID()
  res.setHeader("X-Request-Id", req.id)
  next()
}

// Central error handler. Previously the app returned `err.message` verbatim to
// the client, leaking stack-adjacent internals (DB errors, file paths, driver
// messages). Now the full error is logged server-side against the correlation
// id, and the client receives only a generic message + that id.
//
// Express identifies an error handler by its arity (4 args), so `next` must
// stay in the signature even though it is unused.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500

  // Log the real error (structured) with the correlation id for server-side
  // diagnosis. The client only ever sees the generic message + id below.
  ;(req.log || logger).error("unhandled_error", {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    status,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack,
  })

  // Forward server-side faults to optional error tracking (no-op if disabled).
  if (status >= 500) {
    captureException(err, { requestId: req.id, path: req.originalUrl })
  }

  // For client errors (4xx) a curated message is safe to surface; for 5xx we
  // never expose the underlying message.
  const clientMessage =
    status < 500 && typeof err.publicMessage === "string"
      ? err.publicMessage
      : status < 500
        ? "Invalid request"
        : "An unexpected error occurred. Please try again."

  if (res.headersSent) {
    return next(err)
  }

  res.status(status).json({ error: clientMessage, requestId: req.id })
}

module.exports = { requestId, errorHandler }
