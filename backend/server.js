const express = require("express")
const http = require("http")
const cors = require("cors")
const helmet = require("helmet")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const path = require("path")
const { requestId, errorHandler } = require("./middleware/errorHandler")
const { requestLogger } = require("./middleware/requestLogger")
const metrics = require("./utils/metrics")
const { initObservability } = require("./utils/observability")

// Load environment variables
dotenv.config()

// Initialize optional error tracking (Sentry) — no-op unless SENTRY_DSN is set
// and @sentry/node is installed.
initObservability()

// Check if MONGO_URI is loaded
if (!process.env.MONGO_URI) {
  console.error("Error: MONGO_URI is not defined in .env file")
  process.exit(1)
}

// Initialize Express
const app = express()

// The app runs behind the Nginx reverse proxy (one hop). Trusting it makes
// req.ip resolve to the real client address from X-Forwarded-For, which the
// auth rate limiters key on — without this every client would share the
// proxy's IP and a single bucket.
app.set("trust proxy", 1)

// Correlation id on every request (echoed as X-Request-Id); must run first so
// it is available to all downstream middleware and the error handler.
app.use(requestId)

// Security headers (defense-in-depth: the backend port is also exposed
// directly, not only behind nginx). CSP is left to nginx, which serves the
// SPA's HTML — the backend only returns JSON and file streams, so a strict
// app-level CSP would add no value here. crossOriginResourcePolicy is relaxed
// so the SPA origin can consume API responses / file downloads.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)

// Cap JSON body size — large payloads should only ever be multipart uploads,
// which multer handles separately. This blocks oversized JSON DoS attempts.
app.use(express.json({ limit: "1mb" }))

// Structured per-request forensic logging, bound to the correlation id. Mounted
// here so every API request (but not the static error handler) is traced.
app.use(requestLogger)

// Configure CORS properly
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:8800", "http://frontend:5173"],  //? port --> 5173
  credentials: true,
}
app.use(cors(corsOptions))

// Import models for initialization
const SystemSettings = require("./models/SystemSettings")
const { cleanupExpiredFiles } = require("./utils/fileExpiration")
const { runRetention } = require("./utils/retention")
const { initRealtime } = require("./utils/realtime")
const blobStorage = require("./utils/storage")
const keyVault = require("./utils/keyVault")

//! Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected")
    
    // Validate the key vault (active KEK version present) — fail fast on misconfig
    keyVault.init()

    // Initialize system settings
    await SystemSettings.initializeDefaults()
    console.log("System settings initialized")

    // Initialize object storage (creates the MinIO bucket if needed; no-op for
    // the local driver). Non-fatal so the API still boots if MinIO is briefly
    // unavailable — blob ops will then surface their own errors.
    try {
      await blobStorage.init()
    } catch (storageErr) {
      console.error("Storage init error (non-fatal):", storageErr.message)
    }
    
    // Schedule periodic cleanup of expired files + data-retention pass (hourly).
    const runMaintenance = async () => {
      try {
        const result = await cleanupExpiredFiles()
        if (result.deleted > 0) {
          console.log(`Cleanup: Deleted ${result.deleted} expired files`)
        }
      } catch (err) {
        console.error("Cleanup error:", err)
      }
      // Retention enforcement (stale/old sessions). Logs its own summary.
      await runRetention()
    }
    runMaintenance() // run once on boot
    setInterval(runMaintenance, 60 * 60 * 1000) // Every hour
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1)
  })

// Serve uploaded files from a static directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Import routes after MongoDB connection
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user")
const adminRoutes = require("./routes/admin")
const fileRoutes = require("./routes/files")
const folderRoutes = require("./routes/folders")
const contactRoutes = require("./routes/contact")
const organizationRoutes = require("./routes/organization")

// Use routes
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/files", fileRoutes)
app.use("/api/folders", folderRoutes)
app.use("/api/contact", contactRoutes)
app.use("/api/organization", organizationRoutes)

// Prometheus metrics endpoint (scraped directly off the backend container; not
// exposed through the public nginx proxy). Zero-dependency text exposition.
app.get("/metrics", (req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4")
  res.send(metrics.render())
})

// Default route
app.get("/", (req, res) => {
  res.send("Server is running on http://localhost:5000")
})

// Central error handler — logs full detail server-side against the request's
// correlation id and returns only a safe, generic message to the client.
app.use(errorHandler)

// Start the server. We create an explicit HTTP server (instead of app.listen)
// so Socket.IO can share the same port for the real-time security dashboard.
const PORT = process.env.PORT || 5000
const server = http.createServer(app)
initRealtime(server)
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
