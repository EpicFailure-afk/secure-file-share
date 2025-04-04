"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaKey } from "react-icons/fa"
import styles from "./ForgotPassword.module.css"
import { requestPasswordReset, verifyPasswordReset } from "../api"

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1) // Step 1: Email, Step 2: Token & New Password

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await requestPasswordReset({ email })

      if (!response || response.error) {
        setError(response?.error || "Failed to send reset token. Please try again.")
        return
      }

      if (response.success) {
        setStep(2)
        setSuccess("Verification code sent to your email.")
      } else {
        setError("Failed to send verification token. Please try again.")
      }
    } catch (err) {
      setError("Network error. Please check your connection.")
      console.error("Reset Request Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyReset = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      const response = await verifyPasswordReset({
        email,
        token,
        newPassword,
      })

      if (!response || response.error) {
        setError(response?.error || "Failed to reset password. Please try again.")
        return
      }

      if (response.success) {
        setSuccess("Password reset successful! Redirecting to login page...")
        // Clear form
        setEmail("")
        setToken("")
        setNewPassword("")
        setConfirmPassword("")

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate("/login")
        }, 2000)
      } else {
        setError("Failed to reset password. Please try again.")
      }
    } catch (err) {
      setError("Network error. Please check your connection.")
      console.error("Reset Verification Error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className={styles.formCard}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className={styles.formHeader}>
            <h2>Reset Password</h2>
            <p>
              {step === 1
                ? "Enter your email to receive a verification code"
                : "Enter the verification code and your new password"}
            </p>
          </div>

          {step === 1 ? (
            <form className={styles.resetForm} onSubmit={handleRequestReset}>
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaEnvelope />
                </div>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.success}>{success}</p>}

              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? "Sending..." : "Send Verification Code"}
              </button>

              <p className={styles.loginLink}>
                Remember your password? <Link to="/login">Back to Login</Link>
              </p>
            </form>
          ) : (
            <form className={styles.resetForm} onSubmit={handleVerifyReset}>
              <div className={styles.tokenInfo}>
                <p>We've sent a 6-character verification code to your email.</p>
                <p>Please check your inbox and enter the code below.</p>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaKey />
                </div>
                <input
                  type="text"
                  placeholder="Enter 6-character code"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.success}>{success}</p>}

              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                className={styles.backBtn}
                onClick={() => {
                  setStep(1)
                  setError(null)
                  setSuccess(null)
                }}
              >
                Back
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default ForgotPassword

