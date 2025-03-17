"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa"
import styles from "./Login.module.css"
import { loginUser } from "../api"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await loginUser({ email, password })

      if (!response || response.error) {
        setError(response?.error || "Login failed. Please try again.")
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
      console.error("Login Error:", err)
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
            <p>Sign in to your account to continue</p>
          </div>

          <form className={styles.loginForm} onSubmit={handleSubmit}>
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
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className={styles.registerLink}>
              Don't have an account? <Link to="/register">Sign Up</Link>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Login

