"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaCheckCircle,
  FaBuilding,
  FaUserTie,
  FaBriefcase,
  FaKey,
  FaInfoCircle,
  FaPlus,
  FaUsers,
  FaCrown
} from "react-icons/fa"
import styles from "./Register.module.css"
import { registerUser } from "../api"

const Register = () => {
  const navigate = useNavigate()
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "staff",
    inviteCode: "",
    jobTitle: "",
    department: "",
    organizationName: "",
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [orgAction, setOrgAction] = useState("none") // "none", "create", or "join"

  const roles = [
    { value: "staff", label: "Staff", description: "Regular employee with basic file access" },
    { value: "admin", label: "Admin", description: "Administrator with user management" },
  ]

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

    if (userData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    // Validate organization fields
    if (orgAction === "create" && !userData.organizationName.trim()) {
      setError("Organization name is required")
      setLoading(false)
      return
    }

    if (orgAction === "join" && !userData.inviteCode.trim()) {
      setError("Invite code is required to join an organization")
      setLoading(false)
      return
    }

    try {
      const registrationData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        jobTitle: userData.jobTitle,
        department: userData.department,
      }

      // Handle organization actions
      if (orgAction === "create") {
        registrationData.createOrg = true
        registrationData.organizationName = userData.organizationName
        registrationData.role = "manager" // Creator becomes manager
      } else if (orgAction === "join") {
        registrationData.inviteCode = userData.inviteCode
        registrationData.role = userData.role
      } else {
        registrationData.role = "staff"
      }

      const response = await registerUser(registrationData)

      if (response.error) {
        if (response.error.includes("User already exists") || response.error.includes("email already exists")) {
          setError("An account with this email already exists. Please use a different email.")
        } else if (response.error.includes("invite code")) {
          setError("Invalid or expired invite code. Please check and try again.")
        } else if (response.error.includes("Organization name")) {
          setError("Organization name already taken. Please choose a different name.")
        } else {
          setError(response.error)
        }
      } else {
        setSuccess(true)
        setSuccessMessage(response.message || "Registration successful!")
        setUserData({ 
          username: "", 
          email: "", 
          password: "", 
          confirmPassword: "",
          role: "staff",
          inviteCode: "",
          jobTitle: "",
          department: "",
          organizationName: "",
        })

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate("/login")
        }, 2000)
      }
    } catch (err) {
      console.error("Registration error:", err)
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
            {/* Basic Info */}
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
                placeholder="Password (min 8 characters)"
                value={userData.password}
                onChange={handleChange}
                required
                minLength={8}
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

            {/* Organization Section */}
            <div className={styles.sectionDivider}>
              <span>Organization (Optional)</span>
            </div>

            <div className={styles.orgActionButtons}>
              <button
                type="button"
                className={`${styles.orgActionBtn} ${orgAction === "create" ? styles.orgActionActive : ""}`}
                onClick={() => setOrgAction(orgAction === "create" ? "none" : "create")}
              >
                <FaPlus /> Create Organization
              </button>
              <button
                type="button"
                className={`${styles.orgActionBtn} ${orgAction === "join" ? styles.orgActionActive : ""}`}
                onClick={() => setOrgAction(orgAction === "join" ? "none" : "join")}
              >
                <FaUsers /> Join Organization
              </button>
            </div>

            {/* Create Organization Section */}
            {orgAction === "create" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.orgSection}
              >
                <div className={styles.infoBox} style={{ background: "rgba(76, 175, 80, 0.1)", borderColor: "#4caf50" }}>
                  <FaCrown style={{ color: "#4caf50" }} />
                  <span>You will become the <strong>Manager</strong> of this organization</span>
                </div>

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaBuilding />
                  </div>
                  <input
                    type="text"
                    name="organizationName"
                    placeholder="Organization Name"
                    value={userData.organizationName}
                    onChange={handleChange}
                    required={orgAction === "create"}
                  />
                </div>

                {/* Job Info */}
                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaBriefcase />
                  </div>
                  <input
                    type="text"
                    name="jobTitle"
                    placeholder="Your Job Title (optional)"
                    value={userData.jobTitle}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaBuilding />
                  </div>
                  <input
                    type="text"
                    name="department"
                    placeholder="Your Department (optional)"
                    value={userData.department}
                    onChange={handleChange}
                  />
                </div>
              </motion.div>
            )}

            {/* Join Organization Section */}
            {orgAction === "join" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.orgSection}
              >
                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaKey />
                  </div>
                  <input
                    type="text"
                    name="inviteCode"
                    placeholder="Organization Invite Code (case-sensitive)"
                    value={userData.inviteCode}
                    onChange={handleChange}
                    required={orgAction === "join"}
                  />
                </div>

                <div className={styles.infoBox}>
                  <FaInfoCircle />
                  <span>Get the invite code from your organization manager (case-sensitive)</span>
                </div>

                {/* Role Selection */}
                <div className={styles.roleSection}>
                  <label className={styles.fieldLabel}>Select Your Role</label>
                  <div className={styles.roleGrid}>
                    {roles.map((role) => (
                      <label
                        key={role.value}
                        className={`${styles.roleCard} ${userData.role === role.value ? styles.roleSelected : ""}`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={userData.role === role.value}
                          onChange={handleChange}
                        />
                        <div className={styles.roleContent}>
                          <FaUserTie className={styles.roleIcon} />
                          <span className={styles.roleName}>{role.label}</span>
                          <span className={styles.roleDesc}>{role.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Job Info */}
                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaBriefcase />
                  </div>
                  <input
                    type="text"
                    name="jobTitle"
                    placeholder="Job Title (optional)"
                    value={userData.jobTitle}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <FaBuilding />
                  </div>
                  <input
                    type="text"
                    name="department"
                    placeholder="Department (optional)"
                    value={userData.department}
                    onChange={handleChange}
                  />
                </div>
              </motion.div>
            )}

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
                  <p>{successMessage}</p>
                  <p>Redirecting to login page...</p>
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

