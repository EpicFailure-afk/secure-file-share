"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { FaLock, FaDownload, FaKey, FaCheckCircle, FaInfoCircle } from "react-icons/fa"
import styles from "./SharePage.module.css"
import { verifyShareAccess, getSharedFileInfo, requestShareAccess } from "../api"
import logo from "../assets/image.png"

const SharePage = () => {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fileInfo, setFileInfo] = useState(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const response = await getSharedFileInfo(token)
        if (response.error) {
          setError(response.error)
        } else {
          setFileInfo(response.fileInfo)
        }
      } catch (err) {
        setError("Failed to fetch file information")
        console.error("Fetch Error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchFileInfo()
    }
  }, [token])

  const handleRequestAccess = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await requestShareAccess(token)
      if (response.error) {
        setError(response.error)
      } else {
        setVerificationSent(true)
      }
    } catch (err) {
      setError("Failed to request access. Please try again.")
      console.error("Request Access Error:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyAccess = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await verifyShareAccess(token, verificationCode)
      if (response.error) {
        setError(response.error)
      } else {
        setVerificationSuccess(true)
      }
    } catch (err) {
      setError("Failed to verify access code. Please try again.")
      console.error("Verification Error:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async () => {
    try {
      // Show loading state
      setSubmitting(true)

      // Make a fetch request to the backend API
      const response = await fetch(`http://localhost:5000/api/files/share/${token}/download?code=${verificationCode}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to download file")
      }

      // Get the filename from the Content-Disposition header if available
      let filename = fileInfo.fileName
      const contentDisposition = response.headers.get("Content-Disposition")
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1]
        }
      }

      // Convert the response to a blob
      const blob = await response.blob()

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSubmitting(false)
    } catch (err) {
      setError("Failed to download file. Please try again.")
      console.error("Download Error:", err)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading file information...</p>
      </div>
    )
  }

  if (error && !fileInfo) {
    return (
      <div className={styles.errorContainer}>
        <FaInfoCircle className={styles.errorIcon} />
        <h2>File Not Available</h2>
        <p>{error}</p>
        <p>The file you're trying to access may have expired or been removed.</p>
        <Link to="/" className={styles.homeLink}>
          Go to Homepage
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.sharePage}>
      <div className={styles.shareContainer}>
        <div className={styles.logoSection}>
          <img src={logo || "/placeholder.svg"} alt="SecureShare Logo" className={styles.logo} />
          <h1 className={styles.logoText}>SecureShare</h1>
        </div>

        <div className={styles.fileInfoCard}>
          <div className={styles.lockIconContainer}>
            <FaLock className={styles.lockIcon} />
          </div>

          <h2>Secure File Sharing</h2>

          {fileInfo && (
            <div className={styles.fileDetails}>
              <h3>{fileInfo.fileName}</h3>
              <p>
                Size: {formatFileSize(fileInfo.fileSize)} • Type: {formatFileType(fileInfo.fileType)}
              </p>
              <p>Shared by: {fileInfo.ownerName}</p>
            </div>
          )}

          {!verificationSent && !verificationSuccess && (
            <div className={styles.accessRequest}>
              <p>This file is protected. Request access from the owner to view and download it.</p>
              <button className={styles.requestButton} onClick={handleRequestAccess} disabled={submitting}>
                {submitting ? "Sending Request..." : "Request Access"}
              </button>
            </div>
          )}

          {verificationSent && !verificationSuccess && (
            <motion.div
              className={styles.verificationForm}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className={styles.notificationBox}>
                <FaInfoCircle className={styles.infoIcon} />
                <p>A verification code has been sent to the file owner. Please contact them to get the code.</p>
              </div>

              <form onSubmit={handleVerifyAccess}>
                <div className={styles.inputGroup}>
                  <FaKey className={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                  />
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" className={styles.verifyButton} disabled={submitting}>
                  {submitting ? "Verifying..." : "Verify & Access File"}
                </button>
              </form>
            </motion.div>
          )}

          {verificationSuccess && (
            <motion.div
              className={styles.successContainer}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className={styles.successIcon}>
                <FaCheckCircle />
              </div>
              <h3>Access Granted!</h3>
              <p>You now have access to download this file.</p>
              <button className={styles.downloadButton} onClick={handleDownload} disabled={submitting}>
                {submitting ? (
                  "Downloading..."
                ) : (
                  <>
                    <FaDownload /> Download File
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>

        <div className={styles.marketingSection}>
          <h3>Why use SecureShare?</h3>
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔒</div>
              <div className={styles.featureText}>
                <h4>End-to-End Encryption</h4>
                <p>Your files are encrypted with AES-256 for maximum security.</p>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔐</div>
              <div className={styles.featureText}>
                <h4>Owner Verification</h4>
                <p>Two-step verification ensures only authorized access.</p>
              </div>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>⏱️</div>
              <div className={styles.featureText}>
                <h4>Expiring Links</h4>
                <p>All shared files automatically expire for added security.</p>
              </div>
            </div>
          </div>
          <div className={styles.cta}>
            <p>Need to share your own files securely?</p>
            <Link to="/register" className={styles.signupButton}>
              Sign Up Free
            </Link>
          </div>
        </div>

        <div className={styles.footer}>
          <p>&copy; {new Date().getFullYear()} SecureShare. All rights reserved.</p>
          <div className={styles.footerLinks}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Us</a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const formatFileType = (mimeType) => {
  if (!mimeType) return "Unknown"

  const types = {
    "image/": "Image",
    "application/pdf": "PDF Document",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "text/": "Text Document",
    "video/": "Video",
    "audio/": "Audio",
    "application/zip": "ZIP Archive",
    "application/x-rar-compressed": "RAR Archive",
  }

  for (const [prefix, label] of Object.entries(types)) {
    if (mimeType.startsWith(prefix)) {
      return label
    }
  }

  return mimeType.split("/")[1]?.toUpperCase() || "File"
}

export default SharePage

