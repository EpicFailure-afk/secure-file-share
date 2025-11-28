const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const path = require("path")

// Load environment variables
dotenv.config()

// Check if MONGO_URI is loaded
if (!process.env.MONGO_URI) {
  console.error("Error: MONGO_URI is not defined in .env file")
  process.exit(1)
}

// Initialize Express
const app = express()
app.use(express.json())

// Configure CORS properly
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:8800", "http://frontend:5173"],  //? port --> 5173 
  credentials: true,
}
app.use(cors(corsOptions))

// Import models for initialization
const SystemSettings = require("./models/SystemSettings")
const { cleanupExpiredFiles } = require("./utils/fileExpiration")

//! Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected")
    
    // Initialize system settings
    await SystemSettings.initializeDefaults()
    console.log("System settings initialized")
    
    // Schedule periodic cleanup of expired files (every hour)
    setInterval(async () => {
      try {
        const result = await cleanupExpiredFiles()
        if (result.deleted > 0) {
          console.log(`Cleanup: Deleted ${result.deleted} expired files`)
        }
      } catch (err) {
        console.error("Cleanup error:", err)
      }
    }, 60 * 60 * 1000) // Every hour
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
const contactRoutes = require("./routes/contact")

// Use routes
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/files", fileRoutes)
app.use("/api/contact", contactRoutes)

// Default route
app.get("/", (req, res) => {
  res.send("Server is running on http://localhost:5000")
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message)
  res.status(500).json({ error: err.message })
})

// Start the server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

// Start the frontend
const frontend = 8800
app.listen(frontend, () => {
  console.log(`website is running on http://localhost:${frontend}`)
})