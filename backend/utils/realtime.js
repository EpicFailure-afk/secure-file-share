const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const logger = require("./logger")

// Real-time security event bus (Operation Red Zone Phase 6).
//
// A Socket.IO server bolted onto the same HTTP server as the REST API. It powers
// the live security dashboard: security alerts (honey-file access today, risk
// engine in Phase 7) are pushed to connected admins the instant they happen,
// instead of only appearing on the next manual refresh.
//
// Trust model: a socket may only join the security room after presenting a valid
// access token for an ACTIVE admin/superadmin. Non-admins are rejected at the
// handshake — the same "verify every connection" stance as the REST routes.

let io = null
const SECURITY_ROOM = "security"

// Accept a raw JWT or a "Bearer <jwt>" string (matches the REST auth middleware).
function parseToken(raw) {
  if (typeof raw !== "string" || !raw) return null
  return raw.startsWith("Bearer ") ? raw.slice(7) : raw
}

function initRealtime(httpServer) {
  io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: ["http://localhost:5173", "http://localhost:8800", "http://frontend:5173"],
      credentials: true,
    },
  })

  // Handshake authentication + authorization. The live security feed is the
  // superadmin's cross-organization view, so ONLY superadmins may subscribe.
  io.use(async (socket, next) => {
    try {
      const token = parseToken(
        socket.handshake.auth?.token || socket.handshake.headers?.authorization,
      )
      if (!token) return next(new Error("unauthorized"))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId).select("role isActive").lean()
      if (!user || user.isActive === false || user.role !== "superadmin") {
        return next(new Error("forbidden"))
      }

      socket.data.userId = decoded.userId
      socket.data.role = user.role
      next()
    } catch {
      next(new Error("unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    socket.join(SECURITY_ROOM)
    logger.info("realtime_connect", { userId: socket.data.userId })
    socket.on("disconnect", () => {
      logger.info("realtime_disconnect", { userId: socket.data.userId })
    })
  })

  logger.info("realtime_initialized", {})
  return io
}

// Push a security event to all connected admins. No-op before init / when no one
// is listening, so callers can fire-and-forget without guarding.
function emitSecurityEvent(event) {
  if (!io) return
  io.to(SECURITY_ROOM).emit("security_event", event)
}

module.exports = { initRealtime, emitSecurityEvent }
