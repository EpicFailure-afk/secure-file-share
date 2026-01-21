"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  FaUsers,
  FaFile,
  FaShieldAlt,
  FaVirus,
  FaClock,
  FaDatabase,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBan,
  FaSync,
  FaTrash,
  FaCog,
  FaHistory,
  FaSearch,
  FaUserShield,
  FaUserSlash,
  FaChartBar,
} from "react-icons/fa"
import styles from "./AdminDashboard.module.css"
import {
  getAdminDashboard,
  getAdminUsers,
  getAdminFiles,
  deactivateUser,
  activateUser,
  updateUserRole,
  deleteUser,
  adminRevokeFile,
  adminRestoreFile,
  adminDeleteFile,
  scanFile,
  verifyFileIntegrity,
  quarantineFile,
  runIntegrityCheck,
  scanPendingFiles,
  cleanupExpiredFiles,
  getAuditLogs,
  getUserProfile,
} from "../api"

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [files, setFiles] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [fileFilter, setFileFilter] = useState({})
  const [pagination, setPagination] = useState({ page: 1, pages: 1 })
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    checkAdminAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  const checkAdminAccess = async () => {
    try {
      const profile = await getUserProfile()
      if (profile.error || profile.user?.role !== "admin") {
        navigate("/dashboard")
        return
      }
      fetchDashboardData()
    } catch (err) {
      console.error("Admin access check error:", err)
      navigate("/dashboard")
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await getAdminDashboard()
      if (response.error) {
        setError(response.error)
      } else {
        setStats(response.stats)
        setRecentActivity(response.recentActivity || [])
      }
    } catch (err) {
      console.error("Dashboard data error:", err)
      setError("Failed to fetch dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (page = 1) => {
    setLoading(true)
    try {
      const response = await getAdminUsers(page, 20, searchQuery)
      if (response.error) {
        setError(response.error)
      } else {
        setUsers(response.users || [])
        setPagination(response.pagination || { page: 1, pages: 1 })
      }
    } catch (err) {
      console.error("Fetch users error:", err)
      setError("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const fetchFiles = async (page = 1) => {
    setLoading(true)
    try {
      const response = await getAdminFiles(page, 20, { ...fileFilter, search: searchQuery })
      if (response.error) {
        setError(response.error)
      } else {
        setFiles(response.files || [])
        setPagination(response.pagination || { page: 1, pages: 1 })
      }
    } catch (err) {
      console.error("Fetch files error:", err)
      setError("Failed to fetch files")
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async (page = 1) => {
    setLoading(true)
    try {
      const response = await getAuditLogs(page, 50)
      if (response.error) {
        setError(response.error)
      } else {
        setAuditLogs(response.logs || [])
        setPagination(response.pagination || { page: 1, pages: 1 })
      }
    } catch (err) {
      console.error("Fetch audit logs error:", err)
      setError("Failed to fetch audit logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "users") fetchUsers()
    else if (activeTab === "files") fetchFiles()
    else if (activeTab === "logs") fetchAuditLogs()
    else if (activeTab === "overview") fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleSearch = () => {
    if (activeTab === "users") fetchUsers()
    else if (activeTab === "files") fetchFiles()
  }

  const showSuccess = (message) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleUserAction = async (userId, action) => {
    setActionLoading(userId)
    try {
      let response
      switch (action) {
        case "deactivate":
          response = await deactivateUser(userId)
          break
        case "activate":
          response = await activateUser(userId)
          break
        case "makeAdmin":
          response = await updateUserRole(userId, "admin")
          break
        case "removeAdmin":
          response = await updateUserRole(userId, "user")
          break
        case "delete":
          if (window.confirm("Are you sure you want to delete this user and all their files?")) {
            response = await deleteUser(userId)
          }
          break
      }
      if (response && !response.error) {
        showSuccess(response.message)
        fetchUsers()
      } else if (response) {
        setError(response.error)
      }
    } catch (err) {
      console.error("User action failed:", err)
      setError("Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleFileAction = async (fileId, action) => {
    setActionLoading(fileId)
    try {
      let response
      switch (action) {
        case "revoke":
          response = await adminRevokeFile(fileId, "Revoked by admin")
          break
        case "restore":
          response = await adminRestoreFile(fileId)
          break
        case "delete":
          if (window.confirm("Are you sure you want to delete this file?")) {
            response = await adminDeleteFile(fileId)
          }
          break
        case "scan":
          response = await scanFile(fileId)
          break
        case "verify":
          response = await verifyFileIntegrity(fileId)
          break
        case "quarantine":
          response = await quarantineFile(fileId)
          break
      }
      if (response && !response.error) {
        showSuccess(response.message || "Action completed")
        fetchFiles()
      } else if (response) {
        setError(response.error)
      }
    } catch (err) {
      console.error("File action failed:", err)
      setError("Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSystemAction = async (action) => {
    setActionLoading(action)
    try {
      let response
      switch (action) {
        case "integrityCheck":
          response = await runIntegrityCheck()
          break
        case "scanPending":
          response = await scanPendingFiles()
          break
        case "cleanup":
          response = await cleanupExpiredFiles()
          break
      }
      if (response && !response.error) {
        showSuccess(`Action completed: ${JSON.stringify(response)}`)
        fetchDashboardData()
      } else if (response) {
        setError(response.error)
      }
    } catch (err) {
      console.error("System action failed:", err)
      setError("Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString()
  }

  const getScanStatusBadge = (status) => {
    const statusConfig = {
      clean: { color: "#4caf50", icon: <FaCheckCircle /> },
      infected: { color: "#f44336", icon: <FaVirus /> },
      pending: { color: "#ff9800", icon: <FaClock /> },
      scanning: { color: "#2196f3", icon: <FaSync className={styles.spinning} /> },
      error: { color: "#9e9e9e", icon: <FaExclamationTriangle /> },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={styles.badge} style={{ backgroundColor: config.color }}>
        {config.icon} {status}
      </span>
    )
  }

  if (loading && activeTab === "overview" && !stats) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.header}>
        <h1>
          <FaUserShield /> Admin Dashboard
        </h1>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <FaExclamationTriangle /> {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className={styles.successMessage}>
          <FaCheckCircle /> {successMessage}
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "overview" ? styles.active : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <FaChartBar /> Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === "users" ? styles.active : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <FaUsers /> Users
        </button>
        <button
          className={`${styles.tab} ${activeTab === "files" ? styles.active : ""}`}
          onClick={() => setActiveTab("files")}
        >
          <FaFile /> Files
        </button>
        <button
          className={`${styles.tab} ${activeTab === "logs" ? styles.active : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          <FaHistory /> Audit Logs
        </button>
      </div>

      <div className={styles.content}>
        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div className={styles.overviewGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#2196f3" }}>
                <FaUsers />
              </div>
              <div className={styles.statInfo}>
                <h3>Users</h3>
                <p className={styles.statValue}>{stats.users.total}</p>
                <span className={styles.statDetail}>
                  {stats.users.active} active, {stats.users.inactive} inactive
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#4caf50" }}>
                <FaFile />
              </div>
              <div className={styles.statInfo}>
                <h3>Files</h3>
                <p className={styles.statValue}>{stats.files.total}</p>
                <span className={styles.statDetail}>
                  {stats.files.revoked} revoked
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#f44336" }}>
                <FaVirus />
              </div>
              <div className={styles.statInfo}>
                <h3>Security</h3>
                <p className={styles.statValue}>{stats.files.infected}</p>
                <span className={styles.statDetail}>
                  infected, {stats.files.pendingScan} pending scan
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#ff9800" }}>
                <FaDatabase />
              </div>
              <div className={styles.statInfo}>
                <h3>Storage</h3>
                <p className={styles.statValue}>{formatBytes(stats.storage.totalUsed)}</p>
                <span className={styles.statDetail}>total used</span>
              </div>
            </div>

            <div className={styles.actionsCard}>
              <h3>
                <FaCog /> System Actions
              </h3>
              <div className={styles.actionButtons}>
                <button
                  onClick={() => handleSystemAction("integrityCheck")}
                  disabled={actionLoading === "integrityCheck"}
                  className={styles.actionBtn}
                >
                  <FaShieldAlt /> {actionLoading === "integrityCheck" ? "Running..." : "Integrity Check"}
                </button>
                <button
                  onClick={() => handleSystemAction("scanPending")}
                  disabled={actionLoading === "scanPending"}
                  className={styles.actionBtn}
                >
                  <FaVirus /> {actionLoading === "scanPending" ? "Scanning..." : "Scan Pending Files"}
                </button>
                <button
                  onClick={() => handleSystemAction("cleanup")}
                  disabled={actionLoading === "cleanup"}
                  className={styles.actionBtn}
                >
                  <FaTrash /> {actionLoading === "cleanup" ? "Cleaning..." : "Cleanup Expired"}
                </button>
              </div>
              <div className={styles.systemStatus}>
                <span className={stats.system.clamAvAvailable ? styles.statusGreen : styles.statusRed}>
                  {stats.system.clamAvAvailable ? "✓ ClamAV Available" : "✗ ClamAV Not Available"}
                </span>
              </div>
            </div>

            <div className={styles.activityCard}>
              <h3>
                <FaHistory /> Recent Activity
              </h3>
              <div className={styles.activityList}>
                {recentActivity.map((activity, index) => (
                  <div key={index} className={styles.activityItem}>
                    <span className={styles.activityAction}>{activity.action}</span>
                    <span className={styles.activityUser}>
                      {activity.userId?.username || "System"}
                    </span>
                    <span className={styles.activityTime}>
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className={styles.tableContainer}>
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button onClick={handleSearch}>
                <FaSearch />
              </button>
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Files</th>
                  <th>Storage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`${styles.badge} ${user.role === "admin" ? styles.adminBadge : ""}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${user.isActive ? styles.activeBadge : styles.inactiveBadge}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{user.fileCount}</td>
                    <td>{formatBytes(user.storageUsed)}</td>
                    <td className={styles.actions}>
                      {user.isActive ? (
                        <button
                          onClick={() => handleUserAction(user._id, "deactivate")}
                          disabled={actionLoading === user._id}
                          title="Deactivate"
                        >
                          <FaUserSlash />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction(user._id, "activate")}
                          disabled={actionLoading === user._id}
                          title="Activate"
                        >
                          <FaCheckCircle />
                        </button>
                      )}
                      {user.role !== "admin" ? (
                        <button
                          onClick={() => handleUserAction(user._id, "makeAdmin")}
                          disabled={actionLoading === user._id}
                          title="Make Admin"
                        >
                          <FaUserShield />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction(user._id, "removeAdmin")}
                          disabled={actionLoading === user._id}
                          title="Remove Admin"
                        >
                          <FaUsers />
                        </button>
                      )}
                      <button
                        onClick={() => handleUserAction(user._id, "delete")}
                        disabled={actionLoading === user._id}
                        title="Delete"
                        className={styles.deleteBtn}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.pages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => fetchUsers(i + 1)}
                    className={pagination.page === i + 1 ? styles.activePage : ""}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <div className={styles.tableContainer}>
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <select
                value={fileFilter.scanStatus || ""}
                onChange={(e) => setFileFilter({ ...fileFilter, scanStatus: e.target.value || undefined })}
              >
                <option value="">All Scan Status</option>
                <option value="clean">Clean</option>
                <option value="infected">Infected</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={fileFilter.isRevoked || ""}
                onChange={(e) => setFileFilter({ ...fileFilter, isRevoked: e.target.value || undefined })}
              >
                <option value="">All Files</option>
                <option value="true">Revoked</option>
                <option value="false">Active</option>
              </select>
              <button onClick={handleSearch}>
                <FaSearch />
              </button>
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Owner</th>
                  <th>Size</th>
                  <th>Upload Date</th>
                  <th>Scan Status</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file._id}>
                    <td>{file.fileName}</td>
                    <td>{file.userId?.username || "Unknown"}</td>
                    <td>{formatBytes(file.fileSize)}</td>
                    <td>{formatDate(file.uploadDate)}</td>
                    <td>{getScanStatusBadge(file.scanStatus)}</td>
                    <td>
                      {file.isRevoked ? (
                        <span className={`${styles.badge} ${styles.revokedBadge}`}>
                          <FaBan /> Revoked
                        </span>
                      ) : file.expiresAt && new Date(file.expiresAt) < new Date() ? (
                        <span className={`${styles.badge} ${styles.expiredBadge}`}>
                          <FaClock /> Expired
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.activeBadge}`}>
                          <FaCheckCircle /> Active
                        </span>
                      )}
                    </td>
                    <td className={styles.actions}>
                      <button
                        onClick={() => handleFileAction(file._id, "scan")}
                        disabled={actionLoading === file._id}
                        title="Scan"
                      >
                        <FaVirus />
                      </button>
                      <button
                        onClick={() => handleFileAction(file._id, "verify")}
                        disabled={actionLoading === file._id}
                        title="Verify Integrity"
                      >
                        <FaShieldAlt />
                      </button>
                      {file.isRevoked ? (
                        <button
                          onClick={() => handleFileAction(file._id, "restore")}
                          disabled={actionLoading === file._id}
                          title="Restore"
                        >
                          <FaSync />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFileAction(file._id, "revoke")}
                          disabled={actionLoading === file._id}
                          title="Revoke"
                        >
                          <FaBan />
                        </button>
                      )}
                      {file.scanStatus === "infected" && (
                        <button
                          onClick={() => handleFileAction(file._id, "quarantine")}
                          disabled={actionLoading === file._id}
                          title="Quarantine"
                          className={styles.warningBtn}
                        >
                          <FaExclamationTriangle />
                        </button>
                      )}
                      <button
                        onClick={() => handleFileAction(file._id, "delete")}
                        disabled={actionLoading === file._id}
                        title="Delete"
                        className={styles.deleteBtn}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.pages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => fetchFiles(i + 1)}
                    className={pagination.page === i + 1 ? styles.activePage : ""}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "logs" && (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{formatDate(log.timestamp)}</td>
                    <td>{log.userId?.username || "System"}</td>
                    <td>
                      <span className={styles.actionBadge}>{log.action}</span>
                    </td>
                    <td>{log.targetType}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          log.status === "success" ? styles.successBadge : styles.failureBadge
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className={styles.details}>
                      {JSON.stringify(log.details).slice(0, 50)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.pages > 1 && (
              <div className={styles.pagination}>
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => fetchAuditLogs(i + 1)}
                    className={pagination.page === i + 1 ? styles.activePage : ""}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AdminDashboard
