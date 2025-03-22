"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa"
import styles from "./Register.module.css"
import { registerUser } from "../api"

const Register = () => {
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (userData.password !== userData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const response = await registerUser(userData)

      if (response.error) {
        setError(response.error)
      } else {
        setSuccess(true)
        setUserData({ username: "", email: "", password: "", confirmPassword: "" })
        setTimeout(() => setSuccess(false), 5000)
      }
    } catch (err) {
      setError("Network error. Please check your connection.")
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
            <h2>Create Account</h2>
            <p>Join our secure file sharing platform</p>
          </div>

          <form className={styles.registerForm} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <FaUser />
              </div>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={userData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <FaEnvelope />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={userData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <FaLock />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={userData.password}
                onChange={handleChange}
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
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={userData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </button>

            <p className={styles.loginLink}>
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </form>
        </motion.div>

        {/* Success Popup */}
        <AnimatePresence>
          {success && (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className={styles.successModal}
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, type: "spring" }}
              >
                <div className={styles.successHeader}>
                  <FaCheckCircle className={styles.successIcon} />
                  <h3>Registration Successful!</h3>
                </div>
                <div className={styles.successBody}>
                  <p>Your account has been created successfully.</p>
                  <p>You can now log in with your credentials.</p>
                </div>
                <div className={styles.successFooter}>
                  <Link to="/login" className={styles.loginNowBtn}>
                    Login Now
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default Register

