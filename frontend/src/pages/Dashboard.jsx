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
  FaBan,
} from "react-icons/fa"
import styles from "./Dashboard.module.css"
import { getUserFiles, uploadFile, deleteFile, shareFile, downloadFile, getUserProfile, verifyUserFileIntegrity, revokeFileAccess, setFileExpiration, preScanFile, downloadFileWithScan } from "../api"

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
      } catch (err) {
        setError("Failed to fetch data. Please try again.")
        console.error("Fetch Data Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  const fetchFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getUserFiles()
      if (response.error) {
        setError(response.error)
        if (response.error === "Unauthorized") {
          localStorage.removeItem("token")
          navigate("/login")
        }
      } else {
        setFiles(response.files || [])
      }
    } catch (err) {
      setError("Failed to fetch files. Please try again.")
      console.error("Fetch Files Error:", err)
    } finally {
      setLoading(false)
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

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await uploadFile(formData, (progress) => {
        setUploadProgress(progress)
      })

      if (response.error) {
        setError(response.error)
      } else {
        setFiles([...files, response.file])
        setError(null)
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
      
      // Show scan notification to user
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
    try {
      const result = await verifyUserFileIntegrity(fileId)
      if (result.verified) {
        alert("File integrity verified successfully!")
      } else {
        alert(`Integrity check failed: ${result.message}`)
      }
    } catch (err) {
      setError("Failed to verify file integrity.")
    }
  }

  const handleRevokeFile = async (fileId) => {
    if (!window.confirm("Are you sure you want to revoke access to this file?")) return
    try {
      const response = await revokeFileAccess(fileId, "Revoked by owner")
      if (response.error) {
        setError(response.error)
      } else {
        fetchFiles()
      }
    } catch (err) {
      setError("Failed to revoke file access.")
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
    try {
      const response = await setFileExpiration(expirationFileId, parseInt(expirationValue), expirationUnit)
      if (response.error) {
        setError(response.error)
      } else {
        const expiryDate = new Date(response.expiresAt).toLocaleDateString()
        setScanNotification({
          safe: true,
          status: "success",
          message: `File expiration set! Expires on ${expiryDate}`,
          fileName: files.find(f => f._id === expirationFileId)?.fileName || "File"
        })
        setTimeout(() => setScanNotification(null), 5000)
        fetchFiles()
      }
    } catch (err) {
      setError("Failed to set file expiration.")
    } finally {
      setExpirationModalOpen(false)
      setExpirationFileId(null)
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
                  <div className={styles.userTooltip}>
                    <div className={styles.tooltipTitle}>User Information</div>
                    <div className={styles.tooltipInfo}>Username: {user.username}</div>
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
                      <button onClick={() => handleRevokeFile(file._id)}>
                        <FaBan /> Revoke Access
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

      {/* Scan Notification Toast */}
      {scanNotification && (
        <motion.div
          className={`${styles.scanNotification} ${scanNotification.safe ? styles.scanSafe : styles.scanDanger}`}
          initial={{ opacity: 0, y: 50, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 50, x: "-50%" }}
        >
          <div className={styles.scanNotificationIcon}>
            {scanNotification.safe ? <FaShieldAlt /> : <FaVirus />}
          </div>
          <div className={styles.scanNotificationContent}>
            <strong>{scanNotification.safe ? "Scan Complete - Safe" : "Security Warning"}</strong>
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
    </div>
  )
}

export default Dashboard

