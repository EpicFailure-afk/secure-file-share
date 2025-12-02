"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  FaUpload,
  FaDownload,
  FaTrash,
  FaShare,
  FaEllipsisV,
  FaFile,
  FaFileAlt,
  FaFileImage,
  FaFilePdf,
  FaFileArchive,
  FaFileVideo,
  FaFileAudio,
  FaFileCode,
  FaUserEdit,
  FaCopy,
  FaCheck,
  FaShieldAlt,
  FaVirus,
  FaClock,
  FaExclamationTriangle,
  FaBuilding,
  FaPlus,
  FaKey,
  FaLock,
  FaUnlock,
  FaHistory,
  FaEye,
  FaTimes,
} from "react-icons/fa"
import styles from "./Dashboard.module.css"
import { getUserFiles, uploadFile, deleteFile, shareFile, downloadFile, getUserProfile, verifyUserFileIntegrity, lockFile, unlockFile, setFileExpiration, preScanFile, downloadFileWithScan, createOrganization, joinOrganization, getOrganizationDetails } from "../api"

const Dashboard = () => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [shareUrl, setShareUrl] = useState(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  
  // New states for expiration modal and scan notifications
  const [expirationModalOpen, setExpirationModalOpen] = useState(false)
  const [expirationValue, setExpirationValue] = useState(30)
  const [expirationUnit, setExpirationUnit] = useState("days")
  const [expirationFileId, setExpirationFileId] = useState(null)
  const [scanNotification, setScanNotification] = useState(null)
  const [isDownloading, setIsDownloading] = useState(null)
  const [uploadFileName, setUploadFileName] = useState(null)
  
  // Lock file modal states
  const [lockModalOpen, setLockModalOpen] = useState(false)
  const [lockModalType, setLockModalType] = useState("lock") // "lock" or "unlock"
  const [lockFileId, setLockFileId] = useState(null)
  const [lockPassword, setLockPassword] = useState("")
  
  // Integrity modal states
  const [integrityModalOpen, setIntegrityModalOpen] = useState(false)
  const [integrityData, setIntegrityData] = useState(null)
  const [integrityLoading, setIntegrityLoading] = useState(false)
  
  // Organization states
  const [organization, setOrganization] = useState(null)
  const [orgModalOpen, setOrgModalOpen] = useState(false)
  const [orgModalType, setOrgModalType] = useState("create") // "create" or "join"
  const [orgFormData, setOrgFormData] = useState({
    name: "",
    description: "",
    industry: "other",
    inviteCode: "",
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch user profile
        const profileResponse = await getUserProfile()
        if (profileResponse.error) {
          if (profileResponse.error === "Unauthorized") {
            localStorage.removeItem("token")
            navigate("/login")
            return
          }
        } else {
          setUser(profileResponse.user)
        }

        // Fetch files
        const filesResponse = await getUserFiles()
        if (filesResponse.error) {
          setError(filesResponse.error)
          if (filesResponse.error === "Unauthorized") {
            localStorage.removeItem("token")
            navigate("/login")
          }
        } else {
          setFiles(filesResponse.files || [])
        }
        
        // Fetch organization if user is in one
        if (profileResponse.user?.organization) {
          const orgResponse = await getOrganizationDetails()
          if (!orgResponse.error && orgResponse.organization) {
            setOrganization(orgResponse.organization)
          }
        }
      } catch (err) {
        setError("Failed to fetch data. Please try again.")
        console.error("Fetch Data Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  const fetchFiles = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const response = await getUserFiles()
      if (response.error) {
        if (response.error === "Unauthorized") {
          localStorage.removeItem("token")
          navigate("/login")
        }
        // Don't show error for background refreshes
        if (showLoading) setError(response.error)
      } else {
        setFiles(response.files || [])
      }
    } catch (err) {
      if (showLoading) {
        setError("Failed to fetch files. Please try again.")
      }
      console.error("Fetch Files Error:", err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Max file size in bytes (500MB)
  const MAX_FILE_SIZE = 500 * 1024 * 1024

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file size only
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}. Your file is ${formatBytes(file.size)}.`)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadFileName(file.name)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await uploadFile(formData, (progress) => {
        setUploadProgress(progress)
      })

      if (response.error) {
        setError(response.error)
      } else {
        // Refresh the file list from server to ensure consistency
        await fetchFiles()
        // Show success notification
        setScanNotification({
          safe: true,
          status: "success",
          message: `"${file.name}" uploaded successfully!`,
          fileName: file.name
        })
        setTimeout(() => setScanNotification(null), 5000)
      }
    } catch (err) {
      setError("Failed to upload file. Please try again.")
      console.error("Upload Error:", err)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setUploadFileName(null)
      // Reset the file input
      e.target.value = ""
    }
  }
  

  const handleDeleteFile = async (fileId) => {
    try {
      const response = await deleteFile(fileId)
      if (response.error) {
        setError(response.error)
      } else {
        setFiles(files.filter((file) => file._id !== fileId))
        setError(null)
      }
    } catch (err) {
      setError("Failed to delete file. Please try again.")
      console.error("Delete Error:", err)
    }
  }

  const handleDownloadFile = async (fileId, fileName) => {
    setIsDownloading(fileId)
    setScanNotification(null)
    
    try {
      const result = await downloadFileWithScan(fileId, fileName)
      
      // Handle locked file - show error instead of malware warning
      if (result.isLocked) {
        setError("This file is locked. Please unlock it before downloading.")
        return
      }
      
      // Handle other errors
      if (result.error && !result.isLocked) {
        setError(result.error)
        return
      }
      
      // Show scan notification to user only if scan was performed
      if (result.scanInfo) {
        const { safe, scanStatus, scanTime, message } = result.scanInfo
        setScanNotification({
          safe,
          status: scanStatus,
          time: scanTime,
          message: message || (safe ? "File is clean and safe to use" : "File may contain malware"),
          fileName
        })
        
        // Auto-hide notification after 8 seconds
        setTimeout(() => setScanNotification(null), 8000)
      }
    } catch (err) {
      setError("Failed to download file. Please try again.")
      console.error("Download Error:", err)
    } finally {
      setIsDownloading(null)
    }
  }

  const handleShareFile = async (fileId) => {
    setSelectedFile(files.find((file) => file._id === fileId))
    try {
      const response = await shareFile(fileId)
      if (response.error) {
        setError(response.error)
      } else {
        setShareUrl(response.shareUrl)
        setShareModalOpen(true)
        setError(null)
      }
    } catch (err) {
      setError("Failed to generate share link. Please try again.")
      console.error("Share Error:", err)
    }
  }

  const getFileIcon = (fileType) => {
    if (!fileType) return <FaFile />

    if (fileType.includes("image")) return <FaFileImage />
    if (fileType.includes("pdf")) return <FaFilePdf />
    if (fileType.includes("zip") || fileType.includes("rar")) return <FaFileArchive />
    if (fileType.includes("video")) return <FaFileVideo />
    if (fileType.includes("audio")) return <FaFileAudio />
    if (fileType.includes("text") || fileType.includes("document")) return <FaFileAlt />
    if (fileType.includes("javascript") || fileType.includes("html") || fileType.includes("css")) return <FaFileCode />

    return <FaFile />
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getScanStatusIcon = (scanStatus) => {
    switch (scanStatus) {
      case "clean":
        return <FaShieldAlt className={styles.statusClean} title="File is clean" />
      case "infected":
        return <FaVirus className={styles.statusInfected} title="File is infected" />
      case "pending":
        return <FaClock className={styles.statusPending} title="Scan pending" />
      case "scanning":
        return <FaClock className={styles.statusScanning} title="Scanning..." />
      case "error":
        return <FaExclamationTriangle className={styles.statusError} title="Scan error" />
      default:
        return null
    }
  }

  const handleVerifyIntegrity = async (fileId) => {
    setIntegrityLoading(true)
    setIntegrityModalOpen(true)
    setActiveDropdown(null)
    try {
      const result = await verifyUserFileIntegrity(fileId)
      setIntegrityData(result)
    } catch (err) {
      setError("Failed to verify file integrity.")
      setIntegrityModalOpen(false)
    } finally {
      setIntegrityLoading(false)
    }
  }

  const handleLockFile = async (fileId, isCurrentlyLocked) => {
    setLockFileId(fileId)
    setLockModalType(isCurrentlyLocked ? "unlock" : "lock")
    setLockPassword("")
    setLockModalOpen(true)
    setActiveDropdown(null)
  }

  const confirmLockUnlock = async () => {
    if (!lockFileId || !lockPassword) {
      setError("Password is required")
      return
    }
    
    if (lockPassword.length < 4) {
      setError("Password must be at least 4 characters")
      return
    }
    
    setError(null)
    const fileName = files.find(f => f._id === lockFileId)?.fileName || "File"
    
    try {
      let response
      if (lockModalType === "lock") {
        response = await lockFile(lockFileId, lockPassword)
      } else {
        response = await unlockFile(lockFileId, lockPassword)
      }
      
      if (response.error) {
        setError(response.error)
      } else {
        // Close modal first
        setLockModalOpen(false)
        setLockFileId(null)
        setLockPassword("")
        
        // Update the file in state immediately for instant UI feedback
        setFiles(prevFiles => prevFiles.map(f => 
          f._id === lockFileId 
            ? { ...f, isLocked: lockModalType === "lock" }
            : f
        ))
        
        // Show success notification
        setScanNotification({
          safe: true,
          status: "success",
          message: response.message,
          fileName
        })
        setTimeout(() => setScanNotification(null), 5000)
        
        // Also refresh from server to ensure consistency
        await fetchFiles()
      }
    } catch (err) {
      setError(`Failed to ${lockModalType} file.`)
    } finally {
      setLockModalOpen(false)
      setLockFileId(null)
      setLockPassword("")
    }
  }

  const handleSetExpiration = async (fileId) => {
    setExpirationFileId(fileId)
    setExpirationValue(30)
    setExpirationUnit("days")
    setExpirationModalOpen(true)
    setActiveDropdown(null)
  }

  const confirmSetExpiration = async () => {
    if (!expirationFileId) return
    setError(null)
    const fileName = files.find(f => f._id === expirationFileId)?.fileName || "File"
    
    try {
      const response = await setFileExpiration(expirationFileId, parseInt(expirationValue), expirationUnit)
      if (response.error) {
        setError(response.error)
      } else {
        // Close modal first
        setExpirationModalOpen(false)
        setExpirationFileId(null)
        
        const expiryDate = new Date(response.expiresAt).toLocaleDateString()
        setScanNotification({
          safe: true,
          status: "success",
          message: `File expiration set! Expires on ${expiryDate}`,
          fileName
        })
        setTimeout(() => setScanNotification(null), 5000)
        
        // Refresh file list
        await fetchFiles()
      }
    } catch (err) {
      setError("Failed to set file expiration.")
    } finally {
      setExpirationModalOpen(false)
      setExpirationFileId(null)
    }
  }

  const openOrgModal = (type) => {
    setOrgModalType(type)
    setOrgFormData({ name: "", description: "", industry: "other", inviteCode: "" })
    setOrgModalOpen(true)
  }

  const handleCreateOrg = async () => {
    if (!orgFormData.name.trim()) {
      setError("Organization name is required")
      return
    }
    
    try {
      const response = await createOrganization({
        name: orgFormData.name,
        description: orgFormData.description,
        industry: orgFormData.industry,
      })
      
      if (response.error) {
        setError(response.error)
      } else {
        setOrganization(response.organization)
        setScanNotification({
          safe: true,
          status: "success",
          message: `Organization "${response.organization.name}" created successfully!`,
          fileName: ""
        })
        setTimeout(() => setScanNotification(null), 5000)
        setOrgModalOpen(false)
        // Reload user data
        const profileRes = await getUserProfile()
        if (profileRes.user) setUser(profileRes.user)
      }
    } catch (err) {
      setError("Failed to create organization")
    }
  }

  const handleJoinOrg = async () => {
    if (!orgFormData.inviteCode.trim()) {
      setError("Invite code is required")
      return
    }
    
    try {
      const response = await joinOrganization({
        inviteCode: orgFormData.inviteCode,
      })
      
      if (response.error) {
        setError(response.error)
      } else {
        setScanNotification({
          safe: true,
          status: "success",
          message: response.message,
          fileName: ""
        })
        setTimeout(() => setScanNotification(null), 5000)
        setOrgModalOpen(false)
        // Reload data
        const profileRes = await getUserProfile()
        if (profileRes.user) {
          setUser(profileRes.user)
          if (profileRes.user.organization) {
            const orgRes = await getOrganizationDetails()
            if (orgRes.organization) setOrganization(orgRes.organization)
          }
        }
      }
    } catch (err) {
      setError("Failed to join organization")
    }
  }

  return (
    <div className={styles.dashboardContainer}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.headerContent}>
          {user && (
            <motion.div className={styles.welcomeWrapper}>
              <motion.h2 className={styles.welcomeMessage}>
                Welcome back,{" "}
                <div className={styles.usernameContainer}>
                  <motion.span
                    className={styles.animatedUsername}
                    initial={{ backgroundPosition: "0% 50%" }}
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    {user.username}
                  </motion.span>
                  {user.organization && user.role && (
                    <span className={styles.userRoleBadge}>
                      ({user.role.charAt(0).toUpperCase() + user.role.slice(1)})
                    </span>
                  )}
                  <div className={styles.userTooltip}>
                    <div className={styles.tooltipTitle}>User Information</div>
                    <div className={styles.tooltipInfo}>Username: {user.username}</div>
                    {user.organization && user.role && (
                      <div className={styles.tooltipInfo}>Role: {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</div>
                    )}
                    {/* Email removed for security purposes */}
                    <div className={styles.tooltipDate}>
                      Member since:{" "}
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              </motion.h2>
              <Link to="/edit-profile" className={styles.editProfileLink}>
                <FaUserEdit /> Edit your data
              </Link>
            </motion.div>
          )}
          <h1>My Files</h1>
        </div>
        <div className={styles.uploadContainer}>
          <label htmlFor="fileUpload" className={styles.uploadBtn}>
            <FaUpload /> Upload File
          </label>
          <input
            type="file"
            id="fileUpload"
            onChange={handleFileUpload}
            className={styles.fileInput}
            disabled={isUploading}
          />
        </div>
      </motion.div>

      {/* Organization Section */}
      {!organization ? (
        <motion.div
          className={styles.orgBanner}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className={styles.orgBannerContent}>
            <FaBuilding className={styles.orgIcon} />
            <div>
              <h3>Join or Create an Organization</h3>
              <p>Collaborate with your team securely</p>
            </div>
          </div>
          <div className={styles.orgBannerActions}>
            <button className={styles.createOrgBtn} onClick={() => openOrgModal("create")}>
              <FaPlus /> Create Organization
            </button>
            <button className={styles.joinOrgBtn} onClick={() => openOrgModal("join")}>
              <FaKey /> Join with Code
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className={styles.orgCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className={styles.orgCardContent}>
            <FaBuilding className={styles.orgIcon} />
            <div>
              <h3>{organization.name}</h3>
              <p>Role: <span className={styles.roleTag}>{user?.role}</span></p>
            </div>
          </div>
          {["admin", "owner", "manager"].includes(user?.role) && (
            <Link to="/organization" className={styles.orgDashboardLink}>
              Manage Organization →
            </Link>
          )}
        </motion.div>
      )}

      {isUploading && (
        <div className={styles.uploadProgress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p>
            {uploadFileName && <span className={styles.uploadFileName}>{uploadFileName}</span>}
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📁</div>
          <h3>No files yet</h3>
          <p>Upload your first file to get started</p>
          <label htmlFor="emptyStateUpload" className={styles.uploadBtn}>
            <FaUpload /> Upload File
          </label>
          <input
            type="file"
            id="emptyStateUpload"
            onChange={handleFileUpload}
            className={styles.fileInput}
            disabled={isUploading}
          />
        </div>
      ) : (
        <motion.div
          className={styles.fileGrid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {files.map((file) => (
            <motion.div
              key={file._id}
              className={styles.fileCard}
              whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.fileIcon}>{getFileIcon(file.fileType)}</div>
              <div className={styles.fileInfo}>
                <h3 className={styles.fileName}>{file.fileName}</h3>
                <p className={styles.fileDetails}>
                  {formatFileSize(file.fileSize)} • {formatDate(file.uploadDate)}
                </p>
                <div className={styles.fileStatus}>
                  {getScanStatusIcon(file.scanStatus)}
                  {file.integrityVerified === false && (
                    <FaExclamationTriangle className={styles.statusWarning} title="Integrity not verified" />
                  )}
                  {file.isLocked && (
                    <FaLock className={styles.statusLocked} title="File is locked" />
                  )}
                  {file.expiresAt && (
                    <span className={styles.expiryBadge} title={`Expires: ${formatDate(file.expiresAt)}`}>
                      <FaClock /> {formatDate(file.expiresAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.fileActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => handleDownloadFile(file._id, file.fileName)}
                  title="Download"
                  disabled={file.scanStatus === "infected" || isDownloading === file._id}
                >
                  {isDownloading === file._id ? (
                    <span className={styles.downloadingSpinner}></span>
                  ) : (
                    <FaDownload />
                  )}
                </button>
                <button className={styles.actionBtn} onClick={() => handleShareFile(file._id)} title="Share">
                  <FaShare />
                </button>
                <button className={styles.actionBtn} onClick={() => handleDeleteFile(file._id)} title="Delete">
                  <FaTrash />
                </button>
                <div className={styles.dropdownContainer}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => setActiveDropdown(activeDropdown === file._id ? null : file._id)}
                    title="More"
                  >
                    <FaEllipsisV />
                  </button>
                  {activeDropdown === file._id && (
                    <div className={styles.dropdown}>
                      <button onClick={() => handleDownloadFile(file._id, file.fileName)}>
                        <FaDownload /> Download
                      </button>
                      <button onClick={() => handleShareFile(file._id)}>
                        <FaShare /> Share
                      </button>
                      <button onClick={() => handleVerifyIntegrity(file._id)}>
                        <FaShieldAlt /> Verify Integrity
                      </button>
                      <button onClick={() => handleSetExpiration(file._id)}>
                        <FaClock /> Set Expiration
                      </button>
                      <button onClick={() => handleLockFile(file._id, file.isLocked)}>
                        <FaKey /> {file.isLocked ? "Unlock File" : "Lock File"}
                      </button>
                      <button onClick={() => handleDeleteFile(file._id)}>
                        <FaTrash /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {shareModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Share File</h3>
            <p>Share this link with others to give them access to "{selectedFile?.fileName}"</p>
            <div className={styles.shareInfo}>
              <p>The recipient will need to request access, and you'll receive a verification code by email.</p>
              <p>You'll need to provide them with this code to grant them access to the file.</p>
            </div>
            <div className={styles.shareLink}>
              <input type="text" value={shareUrl} readOnly />
              <button onClick={() => copyToClipboard(shareUrl)}>{copied ? <FaCheck /> : <FaCopy />}</button>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.closeBtn} onClick={() => setShareModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiration Modal */}
      {expirationModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3><FaClock /> Set File Expiration</h3>
            <p>Set when this file should automatically expire and become inaccessible.</p>
            <div className={styles.expirationForm}>
              <div className={styles.expirationInputGroup}>
                <input
                  type="number"
                  min="1"
                  value={expirationValue}
                  onChange={(e) => setExpirationValue(e.target.value)}
                  className={styles.expirationInput}
                  placeholder="Enter value"
                />
                <select
                  value={expirationUnit}
                  onChange={(e) => setExpirationUnit(e.target.value)}
                  className={styles.expirationSelect}
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
              <div className={styles.expirationPreview}>
                {expirationValue && (
                  <p>
                    File will expire in {expirationValue} {expirationUnit}
                  </p>
                )}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.confirmBtn} onClick={confirmSetExpiration}>
                Set Expiration
              </button>
              <button className={styles.closeBtn} onClick={() => setExpirationModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock/Unlock File Modal */}
      {lockModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setLockModalOpen(false)}>
          <motion.div 
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3>
              {lockModalType === "lock" ? <FaLock /> : <FaUnlock />}
              {" "}
              {lockModalType === "lock" ? "Lock File with Password" : "Unlock File"}
            </h3>
            <p>
              {lockModalType === "lock" 
                ? "Set a password to protect this file. You'll need this password to download or unlock it."
                : "Enter the password to unlock this file."}
            </p>
            <div className={styles.formGroup}>
              <input
                type="password"
                value={lockPassword}
                onChange={(e) => setLockPassword(e.target.value)}
                placeholder={lockModalType === "lock" ? "Create a password (min 4 characters)" : "Enter password"}
                className={styles.formInput}
                autoFocus
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.confirmBtn} onClick={confirmLockUnlock}>
                {lockModalType === "lock" ? "Lock File" : "Unlock File"}
              </button>
              <button className={styles.closeBtn} onClick={() => setLockModalOpen(false)}>
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Integrity Verification Modal */}
      {integrityModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIntegrityModalOpen(false)}>
          <motion.div 
            className={`${styles.modal} ${styles.integrityModal}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className={styles.modalHeader}>
              <h3><FaShieldAlt /> File Integrity Report</h3>
              <button className={styles.modalClose} onClick={() => setIntegrityModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            
            {integrityLoading ? (
              <div className={styles.integrityLoading}>
                <div className={styles.spinner}></div>
                <p>Verifying file integrity...</p>
              </div>
            ) : integrityData ? (
              <div className={styles.integrityContent}>
                {/* Verification Status with Large Checkmark */}
                <div className={styles.integrityStatusLarge}>
                  {integrityData.verified ? (
                    <div className={styles.verifiedLarge}>
                      <FaCheck className={styles.checkmarkLarge} />
                      <h3>File Integrity Verified</h3>
                      <p>This file has not been modified since upload</p>
                    </div>
                  ) : (
                    <div className={styles.failedLarge}>
                      <FaExclamationTriangle className={styles.warningLarge} />
                      <h3>Integrity Check Failed</h3>
                      <p>{integrityData.message}</p>
                    </div>
                  )}
                </div>
                
                {/* Quick Stats */}
                {integrityData.fileInfo && (
                  <div className={styles.quickStats}>
                    <div className={styles.statItem}>
                      <FaDownload />
                      <span>{integrityData.fileInfo.downloadCount} Downloads</span>
                    </div>
                    <div className={styles.statItem}>
                      {integrityData.fileInfo.isLocked ? <FaLock /> : <FaUnlock />}
                      <span>{integrityData.fileInfo.isLocked ? "Locked" : "Unlocked"}</span>
                    </div>
                  </div>
                )}
                
                {/* Access History with IP addresses */}
                {integrityData.accessHistory && integrityData.accessHistory.length > 0 && (
                  <div className={styles.integritySection}>
                    <h4><FaEye /> Recent Access</h4>
                    <div className={styles.historyList}>
                      {integrityData.accessHistory.slice(0, 5).map((access, idx) => (
                        <div key={idx} className={styles.historyItem}>
                          <div className={styles.historyMain}>
                            <span className={styles.historyAction}>{access.action.replace(/_/g, " ")}</span>
                            <span className={styles.historyUser}>{access.user}</span>
                          </div>
                          <div className={styles.historyMeta}>
                            {access.ipAddress && <span className={styles.historyIP}>IP: {access.ipAddress}</span>}
                            <span className={styles.historyTime}>{new Date(access.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Shared Access with IP addresses */}
                {integrityData.sharedAccess && integrityData.sharedAccess.length > 0 && (
                  <div className={styles.integritySection}>
                    <h4><FaShare /> Shared Downloads</h4>
                    <div className={styles.historyList}>
                      {integrityData.sharedAccess.slice(0, 5).map((share, idx) => (
                        <div key={idx} className={styles.historyItem}>
                          <div className={styles.historyMain}>
                            <span className={styles.historyAction}>Downloaded via share link</span>
                          </div>
                          <div className={styles.historyMeta}>
                            <span className={styles.historyIP}>IP: {share.ipAddress}</span>
                            <span className={styles.historyTime}>{new Date(share.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p>No integrity data available.</p>
            )}
            
            <div className={styles.modalActions}>
              <button className={styles.closeBtn} onClick={() => setIntegrityModalOpen(false)}>
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Scan Notification Toast */}
      {scanNotification && (
        <motion.div
          className={`${styles.scanNotification} ${scanNotification.safe ? styles.scanSafe : styles.scanDanger}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div className={styles.scanNotificationIcon}>
            {scanNotification.safe ? <FaShieldAlt /> : <FaVirus />}
          </div>
          <div className={styles.scanNotificationContent}>
            <strong>{scanNotification.safe ? "Success" : "Security Warning"}</strong>
            <p>{scanNotification.message}</p>
            {scanNotification.time && (
              <span className={styles.scanTime}>Scanned in {scanNotification.time}ms</span>
            )}
          </div>
          <button 
            className={styles.scanNotificationClose}
            onClick={() => setScanNotification(null)}
          >
            ×
          </button>
        </motion.div>
      )}

      {/* Organization Modal */}
      {orgModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setOrgModalOpen(false)}>
          <motion.div 
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className={styles.modalHeader}>
              <h2>
                <FaBuilding /> {orgModalType === "create" ? "Create Organization" : "Join Organization"}
              </h2>
              <button className={styles.modalClose} onClick={() => setOrgModalOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {orgModalType === "create" ? (
                <>
                  <div className={styles.formGroup}>
                    <label>Organization Name *</label>
                    <input
                      type="text"
                      value={orgFormData.name}
                      onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                      placeholder="Enter organization name"
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Description</label>
                    <textarea
                      value={orgFormData.description}
                      onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
                      placeholder="Describe your organization (optional)"
                      className={styles.formTextarea}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Industry</label>
                    <select
                      value={orgFormData.industry}
                      onChange={(e) => setOrgFormData({ ...orgFormData, industry: e.target.value })}
                      className={styles.formSelect}
                    >
                      <option value="technology">Technology</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Finance</option>
                      <option value="education">Education</option>
                      <option value="government">Government</option>
                      <option value="retail">Retail</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className={styles.formGroup}>
                  <label>Invite Code *</label>
                  <input
                    type="text"
                    value={orgFormData.inviteCode}
                    onChange={(e) => setOrgFormData({ ...orgFormData, inviteCode: e.target.value.toUpperCase() })}
                    placeholder="Enter invite code"
                    className={styles.formInput}
                    style={{ textTransform: "uppercase", letterSpacing: "2px", fontFamily: "monospace" }}
                  />
                  <p className={styles.formHint}>Get the invite code from your organization admin</p>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.confirmBtn} 
                onClick={orgModalType === "create" ? handleCreateOrg : handleJoinOrg}
              >
                {orgModalType === "create" ? "Create Organization" : "Join Organization"}
              </button>
              <button className={styles.closeBtn} onClick={() => setOrgModalOpen(false)}>
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

