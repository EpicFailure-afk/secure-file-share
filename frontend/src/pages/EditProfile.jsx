"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { FaUser, FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaSave } from "react-icons/fa"
import styles from "./EditProfile.module.css"
import { getUserProfile, updateUserProfile, updateUserPassword } from "../api"

const EditProfile = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState("profile")
  const navigate = useNavigate()

  // Profile form state
  const [profileData, setProfileData] = useState({
    username: "",
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    const fetchUserData = async () => {
      setLoading(true)
      try {
        const response = await getUserProfile()
        if (response.error) {
          if (response.error === "Unauthorized") {
            localStorage.removeItem("token")
            navigate("/login")
            return
          }
          setError(response.error)
        } else {
          setUser(response.user)
          setProfileData({
            username: response.user.username,
          })
        }
      } catch (err) {
        setError("Failed to fetch user data. Please try again.")
        console.error("Fetch User Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [navigate])

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    })
  }

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    })
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const response = await updateUserProfile(profileData)
      if (response.error) {
        setError(response.error)
      } else {
        setSuccess("Profile updated successfully!")
        setUser({
          ...user,
          username: profileData.username,
        })

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      }
    } catch (err) {
      setError("Failed to update profile. Please try again.")
      console.error("Update Profile Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match")
      setLoading(false)
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      const response = await updateUserPassword(passwordData)
      if (response.error) {
        setError(response.error)
      } else {
        setSuccess("Password updated successfully!")
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      }
    } catch (err) {
      setError("Failed to update password. Please try again.")
      console.error("Update Password Error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading your profile...</p>
      </div>
    )
  }

  return (
    <div className={styles.editProfileContainer}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button className={styles.backButton} onClick={() => navigate("/dashboard")}>
          <FaArrowLeft /> Back to Dashboard
        </button>
        <h1>Edit Your Profile</h1>
      </motion.div>

      <motion.div
        className={styles.tabsContainer}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <button
          className={`${styles.tabButton} ${activeTab === "profile" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile Information
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "password" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("password")}
        >
          Change Password
        </button>
      </motion.div>

      {error && (
        <motion.div
          className={styles.error}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          className={styles.success}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {success}
        </motion.div>
      )}

      <motion.div
        className={styles.formContainer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {activeTab === "profile" && (
          <form className={styles.form} onSubmit={handleProfileSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaUser />
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <div className={styles.inputGroup}>
                <input type="email" id="email" value={user?.email || ""} disabled className={styles.disabledInput} />
              </div>
              <p className={styles.helperText}>Email cannot be changed</p>
            </div>

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <FaSave /> Save Changes
                </>
              )}
            </button>
          </form>
        )}

        {activeTab === "password" && (
          <form className={styles.form} onSubmit={handlePasswordSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Current Password</label>
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="newPassword">New Password</label>
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
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
            </div>

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? (
                "Updating..."
              ) : (
                <>
                  <FaSave /> Update Password
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}

export default EditProfile

