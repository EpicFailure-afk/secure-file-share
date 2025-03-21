"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaKey } from "react-icons/fa"
import styles from "./Login.module.css"
import { requestLoginToken, verifyLoginToken } from "../api"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1) // Step 1: Email/Password, Step 2: Token verification
  const [tokenSent, setTokenSent] = useState(false)
  const navigate = useNavigate()

  const handleRequestToken = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await requestLoginToken({ email, password })

      if (!response || response.error) {
        setError(response?.error || "Login failed. Please check your credentials.")
        return
      }

      if (response.success) {
        setTokenSent(true)
        setStep(2)
      } else {
        setError("Failed to send verification token. Please try again.")
      }
    } catch (err) {
      setError("Network error. Please check your connection.")
      console.error("Login Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyToken = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await verifyLoginToken({ email, token })

      if (!response || response.error) {
        setError(response?.error || "Verification failed. Please check your token.")
        return
      }

      if (response.token) {
        localStorage.setItem("token", response.token)
        navigate("/dashboard")
      } else {
        setError("Invalid response from server.")
      }
    } catch (err) {
      setError("Network error. Please check your connection.")
      console.error("Verification Error:", err)
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
            <h2>Welcome Back</h2>
            <p>
              {step === 1 ? "Sign in to your account to continue" : "Enter the verification code sent to your email"}
            </p>
          </div>

          {step === 1 ? (
            <form className={styles.loginForm} onSubmit={handleRequestToken}>
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaEnvelope />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className={styles.forgotPassword}>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? "Processing..." : "Continue"}
              </button>

              <p className={styles.registerLink}>
                Don't have an account? <Link to="/register">Sign Up</Link>
              </p>
            </form>
          ) : (
            <form className={styles.loginForm} onSubmit={handleVerifyToken}>
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

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                className={styles.backBtn}
                onClick={() => {
                  setStep(1)
                  setError(null)
                }}
              >
                Back to Login
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Login

