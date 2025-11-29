"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  FaBuilding,
  FaUsers,
  FaUserPlus,
  FaUserCheck,
  FaUserTimes,
  FaUserCog,
  FaCog,
  FaChartBar,
  FaFile,
  FaClock,
  FaKey,
  FaCopy,
  FaSync,
  FaCheck,
  FaTimes,
  FaTrash,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHdd,
  FaShieldAlt,
  FaHistory,
  FaSignOutAlt,
  FaCrown,
} from "react-icons/fa"
import styles from "./OrgDashboard.module.css"
import {
  getOrganizationDetails,
  getOrganizationStats,
  getOrganizationMembers,
  approveMember,
  updateMemberRole,
  removeMember,
  regenerateInviteCode,
  updateOrganizationSettings,
  leaveOrganization,
  transferOwnership,
  deleteOrganization,
  getUserProfile,
} from "../api"

const OrgDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [organization, setOrganization] = useState(null)
  const [stats, setStats] = useState(null)
  const [members, setMembers] = useState([])
  const [pendingMembers, setPendingMembers] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [pagination, setPagination] = useState({ page: 1, pages: 1 })
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }
    loadInitialData()
  }, [navigate])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [profileRes, orgRes] = await Promise.all([
        getUserProfile(),
        getOrganizationDetails(),
      ])

      if (profileRes.error || !profileRes.user) {
        navigate("/login")
        return
      }

      setUserProfile(profileRes.user)

      if (orgRes.error || !orgRes.organization) {
        navigate("/dashboard")
        return
      }

      setOrganization(orgRes.organization)

      // Check if user has access to org dashboard
      const userRole = profileRes.user.role
      if (!["admin", "owner", "manager", "superadmin"].includes(userRole)) {
        navigate("/dashboard")
        return
      }

      await fetchStats()
    } catch (err) {
      setError("Failed to load organization data")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await getOrganizationStats()
      if (!response.error) {
        setStats(response.stats)
      }
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }

  const fetchMembers = async (page = 1) => {
    setLoading(true)
    try {
      const filters = {}
      if (searchQuery) filters.search = searchQuery
      if (roleFilter) filters.role = roleFilter

      const response = await getOrganizationMembers(page, 20, filters)
      if (!response.error) {
        setMembers(response.members || [])
        setPagination(response.pagination || { page: 1, pages: 1 })
      }
    } catch (err) {
      setError("Failed to fetch members")
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingMembers = async () => {
    try {
      const response = await getOrganizationMembers(1, 50, { status: "pending" })
      if (!response.error) {
        setPendingMembers(response.members || [])
      }
    } catch (err) {
      console.error("Error fetching pending members:", err)
    }
  }

  useEffect(() => {
    if (activeTab === "members") fetchMembers()
    else if (activeTab === "pending") fetchPendingMembers()
    else if (activeTab === "overview") fetchStats()
  }, [activeTab])

  const showSuccess = (message) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleApprove = async (memberId, action) => {
    setActionLoading(memberId)
    try {
      const response = await approveMember(memberId, action)
      if (!response.error) {
        showSuccess(response.message)
        fetchPendingMembers()
        fetchStats()
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError("Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    setActionLoading(memberId)
    try {
      const response = await updateMemberRole(memberId, newRole)
      if (!response.error) {
        showSuccess(response.message)
        fetchMembers()
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError("Failed to update role")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return
    
    setActionLoading(memberId)
    try {
      const response = await removeMember(memberId)
      if (!response.error) {
        showSuccess(response.message)
        fetchMembers()
        fetchStats()
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError("Failed to remove member")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRegenerateCode = async () => {
    setActionLoading("invite")
    try {
      const response = await regenerateInviteCode(72)
      if (!response.error) {
        setOrganization(prev => ({
          ...prev,
          inviteCode: response.inviteCode,
          inviteCodeExpires: response.expiresAt,
        }))
        showSuccess("Invite code regenerated")
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError("Failed to regenerate invite code")
    } finally {
      setActionLoading(null)
    }
  }

  const copyInviteCode = () => {
    navigator.clipboard.writeText(organization?.inviteCode || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeaveOrg = async () => {
    if (!window.confirm("Are you sure you want to leave this organization?")) return
    
    try {
      const response = await leaveOrganization()
      if (!response.error) {
        navigate("/dashboard")
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError("Failed to leave organization")
    }
  }

  const handleDeleteOrg = async () => {
    try {
      const response = await deleteOrganization()
      if (!response.error) {
        navigate("/dashboard")
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError("Failed to delete organization")
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
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getRoleBadge = (role) => {
    const colors = {
      owner: "#ffd700",
      admin: "#e52e71",
      manager: "#2196f3",
      staff: "#4caf50",
    }
    return (
      <span className={styles.roleBadge} style={{ backgroundColor: colors[role] || "#666" }}>
        {role === "owner" && <FaCrown />} {role}
      </span>
    )
  }

  const isOwner = organization?.owner?._id === userProfile?._id || 
                  organization?.owner === userProfile?._id

  if (loading && !organization) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading organization dashboard...</p>
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
        <div className={styles.headerLeft}>
          <FaBuilding className={styles.headerIcon} />
          <div>
            <h1>{organization?.name}</h1>
            <span className={styles.planBadge}>{organization?.subscription?.plan || "free"} plan</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {!isOwner && (
            <button className={styles.leaveBtn} onClick={handleLeaveOrg}>
              <FaSignOutAlt /> Leave Organization
            </button>
          )}
        </div>
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

      {/* Invite Code Card */}
      <div className={styles.inviteCard}>
        <div className={styles.inviteInfo}>
          <FaKey className={styles.inviteIcon} />
          <div>
            <h3>Invite Code</h3>
            <p>Share this code to invite new members</p>
          </div>
        </div>
        <div className={styles.inviteCodeSection}>
          <code className={styles.inviteCode}>{organization?.inviteCode || "N/A"}</code>
          <button className={styles.copyBtn} onClick={copyInviteCode}>
            {copied ? <FaCheck /> : <FaCopy />}
          </button>
          {["admin", "owner"].includes(userProfile?.role) && (
            <button 
              className={styles.regenerateBtn} 
              onClick={handleRegenerateCode}
              disabled={actionLoading === "invite"}
            >
              <FaSync className={actionLoading === "invite" ? styles.spinning : ""} />
            </button>
          )}
        </div>
        {organization?.inviteCodeExpires && (
          <span className={styles.expiresAt}>
            <FaClock /> Expires: {formatDate(organization.inviteCodeExpires)}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "overview" ? styles.active : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <FaChartBar /> Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === "members" ? styles.active : ""}`}
          onClick={() => setActiveTab("members")}
        >
          <FaUsers /> Members
        </button>
        {["admin", "owner", "superadmin"].includes(userProfile?.role) && (
          <button
            className={`${styles.tab} ${activeTab === "pending" ? styles.active : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            <FaUserPlus /> Pending
            {pendingMembers.length > 0 && (
              <span className={styles.badge}>{pendingMembers.length}</span>
            )}
          </button>
        )}
        {isOwner && (
          <button
            className={`${styles.tab} ${activeTab === "settings" ? styles.active : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <FaCog /> Settings
          </button>
        )}
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
                <h3>Total Members</h3>
                <p className={styles.statValue}>{stats.users?.totalUsers || 0}</p>
                <span className={styles.statDetail}>
                  {stats.users?.activeUsers || 0} active
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#ff9800" }}>
                <FaUserPlus />
              </div>
              <div className={styles.statInfo}>
                <h3>Pending Approvals</h3>
                <p className={styles.statValue}>{stats.users?.pendingUsers || 0}</p>
                <span className={styles.statDetail}>Awaiting review</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#4caf50" }}>
                <FaFile />
              </div>
              <div className={styles.statInfo}>
                <h3>Total Files</h3>
                <p className={styles.statValue}>{stats.files?.totalFiles || 0}</p>
                <span className={styles.statDetail}>
                  {formatBytes(stats.files?.totalSize || 0)}
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#e52e71" }}>
                <FaHdd />
              </div>
              <div className={styles.statInfo}>
                <h3>Storage Used</h3>
                <p className={styles.statValue}>{formatBytes(stats.users?.totalStorage || 0)}</p>
                <span className={styles.statDetail}>
                  of {formatBytes(organization?.settings?.totalStorageLimit || 0)}
                </span>
              </div>
            </div>

            {/* Role Distribution */}
            <div className={styles.rolesCard}>
              <h3><FaUserCog /> Role Distribution</h3>
              <div className={styles.rolesList}>
                {Object.entries(stats.roles || {}).map(([role, count]) => (
                  <div key={role} className={styles.roleItem}>
                    {getRoleBadge(role)}
                    <span className={styles.roleCount}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Stats */}
            {stats.files?.infectedFiles > 0 && (
              <div className={styles.alertCard}>
                <FaShieldAlt />
                <div>
                  <h4>Security Alert</h4>
                  <p>{stats.files.infectedFiles} infected files detected</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className={styles.membersSection}>
            <div className={styles.filterBar}>
              <div className={styles.searchBox}>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchMembers()}
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={styles.roleSelect}
              >
                <option value="">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
              <button className={styles.searchBtn} onClick={() => fetchMembers()}>
                Search
              </button>
            </div>

            <div className={styles.membersTable}>
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member._id}>
                      <td>
                        <div className={styles.memberInfo}>
                          <div className={styles.avatar}>
                            {member.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className={styles.memberName}>{member.username}</span>
                            <span className={styles.memberEmail}>{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>{getRoleBadge(member.role)}</td>
                      <td>{member.department || "-"}</td>
                      <td>{formatDate(member.createdAt)}</td>
                      <td>
                        {member.role !== "owner" && (
                          <div className={styles.actionBtns}>
                            {["admin", "owner"].includes(userProfile?.role) && (
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member._id, e.target.value)}
                                disabled={actionLoading === member._id}
                                className={styles.roleDropdown}
                              >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                                {isOwner && <option value="admin">Admin</option>}
                              </select>
                            )}
                            {["admin", "owner"].includes(userProfile?.role) && (
                              <button
                                className={styles.removeBtn}
                                onClick={() => handleRemoveMember(member._id)}
                                disabled={actionLoading === member._id}
                                title="Remove member"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {members.length === 0 && (
                <div className={styles.emptyState}>
                  <FaUsers />
                  <p>No members found</p>
                </div>
              )}
            </div>

            {pagination.pages > 1 && (
              <div className={styles.pagination}>
                <button
                  disabled={pagination.page === 1}
                  onClick={() => fetchMembers(pagination.page - 1)}
                >
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button
                  disabled={pagination.page === pagination.pages}
                  onClick={() => fetchMembers(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === "pending" && (
          <div className={styles.pendingSection}>
            <h2>Pending Member Requests</h2>
            
            {pendingMembers.length === 0 ? (
              <div className={styles.emptyState}>
                <FaUserCheck />
                <p>No pending requests</p>
              </div>
            ) : (
              <div className={styles.pendingList}>
                {pendingMembers.map((member) => (
                  <div key={member._id} className={styles.pendingCard}>
                    <div className={styles.pendingInfo}>
                      <div className={styles.avatar}>
                        {member.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4>{member.username}</h4>
                        <p>{member.email}</p>
                        <span className={styles.pendingMeta}>
                          {member.jobTitle && `${member.jobTitle} • `}
                          {member.department && `${member.department} • `}
                          Requested as {member.role}
                        </span>
                      </div>
                    </div>
                    <div className={styles.pendingActions}>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleApprove(member._id, "approve")}
                        disabled={actionLoading === member._id}
                      >
                        <FaCheck /> Approve
                      </button>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleApprove(member._id, "reject")}
                        disabled={actionLoading === member._id}
                      >
                        <FaTimes /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && isOwner && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsCard}>
              <h3><FaCog /> Organization Settings</h3>
              <div className={styles.settingsForm}>
                <div className={styles.settingItem}>
                  <label>Organization Name</label>
                  <input
                    type="text"
                    value={organization?.name || ""}
                    onChange={(e) => setOrganization(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className={styles.settingItem}>
                  <label>Description</label>
                  <textarea
                    value={organization?.description || ""}
                    onChange={(e) => setOrganization(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className={styles.settingItem}>
                  <label>
                    <input
                      type="checkbox"
                      checked={organization?.settings?.requireApprovalForNewUsers || false}
                      onChange={(e) => setOrganization(prev => ({
                        ...prev,
                        settings: { ...prev.settings, requireApprovalForNewUsers: e.target.checked }
                      }))}
                    />
                    Require approval for new members
                  </label>
                </div>
                <button
                  className={styles.saveBtn}
                  onClick={async () => {
                    const res = await updateOrganizationSettings({
                      name: organization.name,
                      description: organization.description,
                      settings: organization.settings,
                    })
                    if (!res.error) showSuccess("Settings saved")
                    else setError(res.error)
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>

            <div className={styles.dangerZone}>
              <h3><FaExclamationTriangle /> Danger Zone</h3>
              <div className={styles.dangerActions}>
                <button
                  className={styles.dangerBtn}
                  onClick={() => setShowTransferModal(true)}
                >
                  <FaCrown /> Transfer Ownership
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => setShowDeleteModal(true)}
                >
                  <FaTrash /> Delete Organization
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3><FaExclamationTriangle /> Delete Organization</h3>
            <p>This action cannot be undone. All members will be removed from the organization.</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} onClick={handleDeleteOrg}>
                Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default OrgDashboard
