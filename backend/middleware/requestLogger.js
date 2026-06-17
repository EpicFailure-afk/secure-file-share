const logger = require("../utils/logger")
const metrics = require("../utils/metrics")

// Forensic request logger (Operation Red Zone Phase 6).
//
// Attaches a child logger bound to the request's correlation id (req.id, set by
// the requestId middleware) as req.log, so any handler can emit structured logs
// that are automatically traceable back to the originating request. Logs one
// structured line per completed request with method, path, status, and latency.
//
// Must be mounted AFTER requestId (needs req.id) and after express.json (so a
// parsed body / auth context may already exist for downstream handlers).
const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint()
  req.log = logger.child({ requestId: req.id })

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6
    metrics.recordHttp(res.statusCode)
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"
    req.log[level]("request", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      // req.user is populated by the auth middleware on authenticated routes;
      // logging the id (not the token) makes actions attributable.
      userId: req.user?.userId,
      ip: req.ip,
    })
  })

  next()
}

module.exports = { requestLogger }
