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
} from "react-icons/fa"
import styles from "./Dashboard.module.css"
import { getUserFiles, uploadFile, deleteFile, shareFile, downloadFile, getUserProfile } from "../api"

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

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
      }
    } catch (err) {
      setError("Failed to upload file. Please try again.")
      console.error("Upload Error:", err)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
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
    try {
      await downloadFile(fileId, fileName)
    } catch (err) {
      setError("Failed to download file. Please try again.")
      console.error("Download Error:", err)
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
          <p>Uploading... {uploadProgress}%</p>
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
              </div>
              <div className={styles.fileActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => handleDownloadFile(file._id, file.fileName)}
                  title="Download"
                >
                  <FaDownload />
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
                      <button onClick={() => handleDownloadFile(file._id, file.fileName)}>Download</button>
                      <button onClick={() => handleShareFile(file._id)}>Share</button>
                      <button onClick={() => handleDeleteFile(file._id)}>Delete</button>
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
    </div>
  )
}

export default Dashboard

