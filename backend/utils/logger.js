// Forensic structured logger (Operation Red Zone Phase 6).
//
// Emits one JSON object per line (newline-delimited JSON) so logs are
// machine-parseable and a single action can be traced across the system by its
// correlation id (`requestId`, minted in middleware/errorHandler.js and echoed
// as the X-Request-Id response header). Intentionally dependency-free — a small
// console-based logger keeps the Docker image lean while giving structured,
// greppable, ship-to-anything output.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN_LEVEL = LEVELS[(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info

// Keys whose values must never reach the logs, even if a caller passes them in a
// context object by accident. Matched case-insensitively on the key name.
const REDACT_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "secret",
  "encryptionkey",
  "lockpassword",
  "dek",
])

function redact(context) {
  if (!context || typeof context !== "object") return undefined
  const out = {}
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue
    if (REDACT_KEYS.has(key.toLowerCase())) {
      out[key] = "[redacted]"
    } else {
      out[key] = value
    }
  }
  return out
}

function emit(level, msg, context) {
  if (LEVELS[level] < MIN_LEVEL) return
  let line
  try {
    line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...redact(context),
    })
  } catch {
    // Circular or otherwise unserializable context — fall back to a safe record.
    line = JSON.stringify({ ts: new Date().toISOString(), level, msg, contextError: true })
  }
  // Errors/warnings to stderr, everything else to stdout — standard separation
  // so container log routers can split severities.
  if (level === "error" || level === "warn") process.stderr.write(line + "\n")
  else process.stdout.write(line + "\n")
}

// A child logger carries fixed bindings (e.g. { requestId, userId }) that are
// merged into every record it emits — the mechanism that threads a correlation
// id through every log line for one request.
function makeLogger(bindings) {
  const base = bindings || {}
  return {
    debug: (msg, ctx) => emit("debug", msg, { ...base, ...ctx }),
    info: (msg, ctx) => emit("info", msg, { ...base, ...ctx }),
    warn: (msg, ctx) => emit("warn", msg, { ...base, ...ctx }),
    error: (msg, ctx) => emit("error", msg, { ...base, ...ctx }),
    child: (extra) => makeLogger({ ...base, ...extra }),
  }
}

module.exports = makeLogger()
