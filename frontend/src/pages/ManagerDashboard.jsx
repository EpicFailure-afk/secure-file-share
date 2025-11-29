"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  FaUsers,
  FaUserCheck,
  FaUserClock,
  FaClock,
  FaUpload,
  FaDownload,
  FaShare,
  FaTrash,
  FaEye,
  FaSignInAlt,
  FaSignOutAlt,
  FaCircle,
  FaDesktop,
  FaMobile,
  FaTabletAlt,
  FaChartLine,
  FaHistory,
  FaCalendarAlt,
  FaFilter,
  FaSync,
  FaUserTie,
  FaChevronDown,
  FaChevronUp,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaBroom,
} from "react-icons/fa"
import styles from "./ManagerDashboard.module.css"
import {
  getMonitorLive,
  getMonitorActivity,
  getMonitorSessions,
  getMonitorWorkLogs,
  getMonitorUser,
  getMonitorStats,
  getUserProfile,
  cleanupSessions,
  resetAllSessions,
} from "../api"

const ManagerDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("live")
  const [liveData, setLiveData] = useState(null)
  const [activities, setActivities] = useState([])
  const [sessions, setSessions] = useState([])
  const [workLogs, setWorkLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [filters, setFilters] = useState({
    activityType: "",
    activityPeriod: "today",
    sessionStatus: "active",
    period: "week",
  })

  // Check access and load initial data
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const profile = await getUserProfile()
        if (!profile.user) {
          navigate("/login")
          return
        }
        if (!["manager", "admin", "owner", "superadmin"].includes(profile.user.role)) {
          navigate("/dashboard")
          return
        }
        if (!profile.user.organization) {
          navigate("/dashboard")
          return
        }
        loadData()
      } catch (err) {
        navigate("/login")
      }
    }
    checkAccess()
  }, [navigate])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (activeTab === "live") {
        loadLiveData()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh, activeTab])

  const loadData = async () => {
    setLoading(true)
    await loadLiveData()
    setLoading(false)
  }

  const loadLiveData = async () => {
    const data = await getMonitorLive()
    if (!data.error) {
      setLiveData(data)
      setLastRefresh(new Date())
    }
  }

  // Cleanup stale sessions
  const handleCleanupSessions = async () => {
    const result = await cleanupSessions()
    if (!result.error) {
      alert(`Cleaned up ${result.cleanedCount} stale sessions`)
      loadLiveData()
    } else {
      alert(result.error)
    }
  }

  // Reset all sessions (admin only)
  const handleResetSessions = async () => {
    if (!window.confirm("This will log out all users. Are you sure?")) {
      return
    }
    const result = await resetAllSessions()
    if (!result.error) {
      alert(`Reset ${result.resetCount} sessions`)
      loadLiveData()
    } else {
      alert(result.error)
    }
  }

  const loadActivities = async () => {
    // Calculate date range based on period filter
    let startDate = null
    
    switch (filters.activityPeriod || "today") {
      case "today": {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        startDate = today
        break
      }
      case "week": {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        startDate = weekAgo
        break
      }
      case "month": {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        startDate = monthAgo
        break
      }
      case "all":
        startDate = null
        break
      default: {
        const defaultDate = new Date()
        defaultDate.setHours(0, 0, 0, 0)
        startDate = defaultDate
      }
    }

    const params = {}
    if (filters.activityType) {
      params.type = filters.activityType
    }
    if (startDate) {
      params.startDate = startDate.toISOString()
    }

    const data = await getMonitorActivity(1, 100, params)
    if (!data.error) {
      setActivities(data.activities || [])
    }
  }

  const loadSessions = async () => {
    const params = {}
    if (filters.sessionStatus) {
      params.status = filters.sessionStatus
    }
    const data = await getMonitorSessions(1, 100, params)
    if (!data.error) {
      setSessions(data.sessions || [])
    }
  }

  const loadWorkLogs = async () => {
    const data = await getMonitorWorkLogs(1, 100)
    if (!data.error) {
      setWorkLogs(data.workLogs)
    }
  }

  const loadStats = async () => {
    const data = await getMonitorStats(filters.period)
    if (!data.error) {
      setStats(data)
    }
  }

  const loadUserDetails = async (userId) => {
    setSelectedUser(userId)
    const data = await getMonitorUser(userId, 7)
    if (!data.error) {
      setUserDetails(data)
    }
  }

  useEffect(() => {
    if (activeTab === "activity") loadActivities()
    else if (activeTab === "sessions") loadSessions()
    else if (activeTab === "worklogs") loadWorkLogs()
    else if (activeTab === "stats") loadStats()
  }, [activeTab, filters])

  const getActivityIcon = (type) => {
    const icons = {
      login: <FaSignInAlt className={styles.activityIconLogin} />,
      logout: <FaSignOutAlt className={styles.activityIconLogout} />,
      file_upload: <FaUpload className={styles.activityIconUpload} />,
      file_download: <FaDownload className={styles.activityIconDownload} />,
      file_share: <FaShare className={styles.activityIconShare} />,
      file_delete: <FaTrash className={styles.activityIconDelete} />,
      file_view: <FaEye className={styles.activityIconView} />,
    }
    return icons[type] || <FaCircle />
  }

  const getDeviceIcon = (device) => {
    if (device === "Mobile") return <FaMobile />
    if (device === "Tablet") return <FaTabletAlt />
    return <FaDesktop />
  }

  const getStatusColor = (status) => {
    if (status === "online") return "#4caf50"
    if (status === "idle") return "#ff9800"
    return "#9e9e9e"
  }

  const formatTime = (date) => {
    if (!date) return "—"
    const d = new Date(date)
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDateTime = (date) => {
    if (!date) return "—"
    const d = new Date(date)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return "0m"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const timeSince = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return "now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // For online users - show "Active now" if within last minute
  const getActiveStatus = (lastActivity) => {
    const seconds = Math.floor((new Date() - new Date(lastActivity)) / 1000)
    if (seconds < 60) return "Active now"
    if (seconds < 3600) return `Active ${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `Active ${Math.floor(seconds / 3600)}h ago`
    return `Active ${Math.floor(seconds / 86400)}d ago`
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading monitoring dashboard...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerLeft}>
          <h1>
            <FaChartLine /> Manager Dashboard
          </h1>
          <p>Real-time organization monitoring</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.refreshInfo}>
            <span>Last updated: {formatTime(lastRefresh)}</span>
            <button
              className={styles.cleanupBtn}
              onClick={handleCleanupSessions}
              title="Clean up stale sessions"
            >
              <FaBroom /> Cleanup
            </button>
            <button
              className={`${styles.refreshBtn} ${autoRefresh ? styles.active : ""}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <FaSync className={autoRefresh ? styles.spinning : ""} />
              {autoRefresh ? "Auto" : "Manual"}
            </button>
            <button className={styles.refreshBtn} onClick={loadData}>
              <FaSync /> Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      {liveData && (
        <motion.div
          className={styles.quickStats}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(76, 175, 80, 0.2)" }}>
              <FaUserCheck style={{ color: "#4caf50" }} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{liveData.onlineCount}</span>
              <span className={styles.statLabel}>Online Now</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(255, 152, 0, 0.2)" }}>
              <FaUserClock style={{ color: "#ff9800" }} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{liveData.idleCount}</span>
              <span className={styles.statLabel}>Idle</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(33, 150, 243, 0.2)" }}>
              <FaHistory style={{ color: "#2196f3" }} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{liveData.todayActivityCount}</span>
              <span className={styles.statLabel}>Today's Activities</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(156, 39, 176, 0.2)" }}>
              <FaUpload style={{ color: "#9c27b0" }} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{liveData.todayStats?.uploads || 0}</span>
              <span className={styles.statLabel}>Uploads Today</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(0, 188, 212, 0.2)" }}>
              <FaDownload style={{ color: "#00bcd4" }} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{liveData.todayStats?.downloads || 0}</span>
              <span className={styles.statLabel}>Downloads Today</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(255, 87, 34, 0.2)" }}>
              <FaShare style={{ color: "#ff5722" }} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{liveData.todayStats?.shares || 0}</span>
              <span className={styles.statLabel}>Shares Today</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "live" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("live")}
        >
          <FaCircle /> Live View
        </button>
        <button
          className={`${styles.tab} ${activeTab === "activity" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          <FaHistory /> Activity Feed
        </button>
        <button
          className={`${styles.tab} ${activeTab === "sessions" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          <FaUsers /> Sessions
        </button>
        <button
          className={`${styles.tab} ${activeTab === "worklogs" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("worklogs")}
        >
          <FaClock /> Work Hours
        </button>
        <button
          className={`${styles.tab} ${activeTab === "stats" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          <FaChartLine /> Statistics
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Live View */}
        {activeTab === "live" && liveData && (
          <div className={styles.liveView}>
            {/* Online Users */}
            <div className={styles.section}>
              <h2>
                <FaUsers /> Currently Active Users ({liveData.onlineUsers?.length || 0})
              </h2>
              <div className={styles.userGrid}>
                {liveData.onlineUsers?.map((user) => (
                  <motion.div
                    key={user.userId}
                    className={styles.userCard}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => loadUserDetails(user.userId)}
                  >
                    <div className={styles.userHeader}>
                      <div className={styles.userAvatar}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} />
                        ) : (
                          <FaUserTie />
                        )}
                        <span
                          className={styles.statusDot}
                          style={{ background: getStatusColor(user.status) }}
                        />
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.username}</span>
                        <span className={styles.userRole}>{user.role}</span>
                      </div>
                    </div>
                    <div className={styles.userMeta}>
                      <div className={styles.metaItem}>
                        {getDeviceIcon(user.device)}
                        <span>{user.browser}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <FaClock />
                        <span>{user.sessionDuration}</span>
                      </div>
                    </div>
                    <div className={styles.userFooter}>
                      <span className={styles.lastActivity}>
                        {getActiveStatus(user.lastActivity)}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {(!liveData.onlineUsers || liveData.onlineUsers.length === 0) && (
                  <div className={styles.emptyState}>
                    <FaUsers />
                    <p>No users currently online</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className={styles.section}>
              <h2>
                <FaHistory /> Recent Activity
              </h2>
              <div className={styles.activityList}>
                {liveData.recentActivities?.map((activity) => (
                  <motion.div
                    key={activity.id}
                    className={styles.activityItem}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className={styles.activityIcon}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className={styles.activityContent}>
                      <span className={styles.activityDesc}>{activity.description}</span>
                      <span className={styles.activityTime}>{timeSince(activity.timestamp)}</span>
                    </div>
                    <div className={styles.activityUser}>
                      {activity.user?.username}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        {activeTab === "activity" && (
          <div className={styles.activityView}>
            <div className={styles.filterBar}>
              <select
                value={filters.activityType}
                onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
              >
                <option value="">All Activities</option>
                <option value="login">Logins</option>
                <option value="logout">Logouts</option>
                <option value="file_upload">Uploads</option>
                <option value="file_download">Downloads</option>
                <option value="file_share">Shares</option>
                <option value="file_delete">Deletes</option>
              </select>
              <select
                value={filters.activityPeriod || "today"}
                onChange={(e) => setFilters({ ...filters, activityPeriod: e.target.value })}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
            {activities.length === 0 ? (
              <div className={styles.emptyState}>
                <FaHistory />
                <p>No activities found for this period</p>
              </div>
            ) : (
            <div className={styles.activityTable}>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td>{formatDateTime(activity.timestamp)}</td>
                      <td>
                        <div className={styles.tableUser}>
                          <span>{activity.user?.username}</span>
                          <span className={styles.role}>{activity.user?.role}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.actionBadge} ${styles[activity.type]}`}>
                          {getActivityIcon(activity.type)}
                          {activity.type.replace("_", " ")}
                        </span>
                      </td>
                      <td>{activity.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Sessions */}
        {activeTab === "sessions" && (
          <div className={styles.sessionsView}>
            <div className={styles.filterBar}>
              <select
                value={filters.sessionStatus}
                onChange={(e) => setFilters({ ...filters, sessionStatus: e.target.value })}
              >
                <option value="active">Active Sessions</option>
                <option value="ended">Ended Sessions</option>
                <option value="">All Sessions</option>
              </select>
            </div>
            <div className={styles.sessionsTable}>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Login Time</th>
                    <th>Duration</th>
                    <th>Device</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <div className={styles.tableUser}>
                          <span>{session.user?.username}</span>
                          <span className={styles.role}>{session.user?.role}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{ background: getStatusColor(session.status) }}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td>{formatDateTime(session.loginTime)}</td>
                      <td>{session.duration}</td>
                      <td>
                        {getDeviceIcon(session.device)} {session.browser} / {session.os}
                      </td>
                      <td>{timeSince(session.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Work Logs */}
        {activeTab === "worklogs" && (
          <div className={styles.worklogsView}>
            <div className={styles.worklogsTable}>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Date</th>
                    <th>Login Time</th>
                    <th>Active Time</th>
                    <th>Sessions</th>
                    <th>Uploads</th>
                    <th>Downloads</th>
                    <th>Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {workLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div
                          className={styles.tableUserClickable}
                          onClick={() => loadUserDetails(log.user?.id)}
                        >
                          <span>{log.user?.username}</span>
                          <span className={styles.role}>{log.user?.role}</span>
                        </div>
                      </td>
                      <td>{new Date(log.date).toLocaleDateString()}</td>
                      <td>{log.formattedLoginTime}</td>
                      <td>{log.formattedActiveTime}</td>
                      <td>{log.sessionCount}</td>
                      <td>{log.activities?.uploads || 0}</td>
                      <td>{log.activities?.downloads || 0}</td>
                      <td>{log.activities?.shares || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Statistics */}
        {activeTab === "stats" && stats && (
          <div className={styles.statsView}>
            <div className={styles.filterBar}>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statsCard}>
                <h3>Overview</h3>
                <div className={styles.statsItems}>
                  <div className={styles.statsItem}>
                    <span>Total Members</span>
                    <strong>{stats.overview?.memberCount}</strong>
                  </div>
                  <div className={styles.statsItem}>
                    <span>Total Activities</span>
                    <strong>{stats.overview?.totalActivities}</strong>
                  </div>
                  <div className={styles.statsItem}>
                    <span>Total Files</span>
                    <strong>{stats.overview?.totalFiles}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.statsCard}>
                <h3>Activity Breakdown</h3>
                <div className={styles.statsItems}>
                  <div className={styles.statsItem}>
                    <span><FaSignInAlt /> Logins</span>
                    <strong>{stats.activityBreakdown?.logins}</strong>
                  </div>
                  <div className={styles.statsItem}>
                    <span><FaUpload /> Uploads</span>
                    <strong>{stats.activityBreakdown?.uploads}</strong>
                  </div>
                  <div className={styles.statsItem}>
                    <span><FaDownload /> Downloads</span>
                    <strong>{stats.activityBreakdown?.downloads}</strong>
                  </div>
                  <div className={styles.statsItem}>
                    <span><FaShare /> Shares</span>
                    <strong>{stats.activityBreakdown?.shares}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.statsCard}>
                <h3>Top Active Users</h3>
                <div className={styles.topUsersList}>
                  {stats.topUsers?.map((user, index) => (
                    <div key={user.userId} className={styles.topUser}>
                      <span className={styles.rank}>#{index + 1}</span>
                      <span className={styles.name}>{user.username}</span>
                      <span className={styles.time}>{user.formattedTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && userDetails && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              className={styles.userModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalUserInfo}>
                  <div className={styles.modalAvatar}>
                    {userDetails.user?.avatar ? (
                      <img src={userDetails.user.avatar} alt="" />
                    ) : (
                      <FaUserTie />
                    )}
                    {userDetails.isOnline && (
                      <span className={styles.onlineBadge} />
                    )}
                  </div>
                  <div>
                    <h2>{userDetails.user?.username}</h2>
                    <p>{userDetails.user?.role} • {userDetails.user?.jobTitle || "No title"}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)}>×</button>
              </div>

              <div className={styles.modalContent}>
                {userDetails.currentSession && (
                  <div className={styles.currentSession}>
                    <FaCircle style={{ color: "#4caf50" }} />
                    <span>
                      Currently online • {userDetails.currentSession.duration} •{" "}
                      {userDetails.currentSession.device}
                    </span>
                  </div>
                )}

                <div className={styles.userSummary}>
                  <div className={styles.summaryItem}>
                    <span>Total Time (7 days)</span>
                    <strong>{userDetails.summary?.formattedLoginTime}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Avg Daily</span>
                    <strong>{userDetails.summary?.formattedAvgDailyTime}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Uploads</span>
                    <strong>{userDetails.summary?.totalUploads}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Downloads</span>
                    <strong>{userDetails.summary?.totalDownloads}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Shares</span>
                    <strong>{userDetails.summary?.totalShares}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Total Files</span>
                    <strong>{userDetails.fileStats?.totalFiles}</strong>
                  </div>
                </div>

                <h3>Recent Activity</h3>
                <div className={styles.modalActivityList}>
                  {userDetails.recentActivities?.slice(0, 10).map((activity, index) => (
                    <div key={index} className={styles.modalActivityItem}>
                      {getActivityIcon(activity.type)}
                      <span>{activity.description}</span>
                      <span className={styles.time}>{timeSince(activity.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ManagerDashboard
