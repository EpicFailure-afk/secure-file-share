"use client"

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { FaSun, FaMoon, FaBars, FaTimes, FaSignOutAlt, FaUserShield, FaBuilding, FaChartLine } from "react-icons/fa"
import styles from "./Navbar.module.css"
import logo from "../assets/image.png"
import { getUserProfile, logoutUser } from "../api"

const Navbar = () => {
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true")
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [scrolled, setScrolled] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOrgMember, setIsOrgMember] = useState(false)
  const [canAccessOrgDashboard, setCanAccessOrgDashboard] = useState(false)
  const [username, setUsername] = useState("")
  const [userRole, setUserRole] = useState("")
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode)
    localStorage.setItem("darkMode", darkMode)
  }, [darkMode])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) {
        setMenuOpen(false) // Close menu when switching to desktop
      }
    }

    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    // Check if user is logged in
    const checkLoginStatus = async () => {
      const token = localStorage.getItem("token")
      setIsLoggedIn(!!token)
      
      if (token) {
        try {
          const profile = await getUserProfile()
          const user = profile.user
          
          // Set username and role
          setUsername(user?.username || "")
          setUserRole(user?.role || "")
          
          // Check if superadmin
          if (user?.role === "superadmin") {
            setIsAdmin(true)
          } else {
            setIsAdmin(false)
          }
          
          // Check if in organization and has org dashboard access
          if (user?.organization) {
            setIsOrgMember(true)
            if (["admin", "owner", "manager"].includes(user?.role)) {
              setCanAccessOrgDashboard(true)
            } else {
              setCanAccessOrgDashboard(false)
            }
          } else {
            setIsOrgMember(false)
            setCanAccessOrgDashboard(false)
          }
        } catch (err) {
          setIsAdmin(false)
          setIsOrgMember(false)
          setCanAccessOrgDashboard(false)
          setUsername("")
          setUserRole("")
        }
      } else {
        setIsAdmin(false)
        setIsOrgMember(false)
        setCanAccessOrgDashboard(false)
        setUsername("")
        setUserRole("")
      }
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("scroll", handleScroll)

    // Check login status initially and whenever location changes
    checkLoginStatus()

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [location])

  // Close mobile menu when changing routes
  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const handleLogout = async () => {
    try {
      // Call backend to properly end session
      await logoutUser()
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      localStorage.removeItem("token")
      localStorage.removeItem("sessionId")
      setIsLoggedIn(false)
      setIsAdmin(false)
      setUsername("")
      setUserRole("")
      navigate("/")
    }
  }

  // Format role for display
  const formatRole = (role) => {
    const roleLabels = {
      staff: "Staff",
      manager: "Manager",
      admin: "Admin",
      owner: "Owner",
      superadmin: "Super Admin"
    }
    return roleLabels[role] || role
  }

  return (
    <motion.nav
      className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.logo}>
        <Link to="/">
          <img src={logo || "/placeholder.svg"} alt="SecureShare Logo" className={styles.logoImage} />
          <span className={styles.logoText}>SecureShare</span>
        </Link>
      </div>

      <button
        className={styles.menuBtn}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        {menuOpen ? <FaTimes /> : <FaBars />}
      </button>

      {!isMobile && (
        <div className={styles.desktopNav}>
          <Link to="/" className={location.pathname === "/" ? styles.active : ""}>
            Home
          </Link>
          <Link to="/contact" className={location.pathname === "/contact" ? styles.active : ""}>
            Contact Us
          </Link>
          {isLoggedIn ? (
            <>
              {username && (
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{username}</span>
                  {isOrgMember && <span className={styles.userRole}>({formatRole(userRole)})</span>}
                </div>
              )}
              <Link to="/dashboard" className={location.pathname === "/dashboard" ? styles.active : ""}>
                Dashboard
              </Link>
              {canAccessOrgDashboard && (
                <Link to="/organization" className={`${location.pathname === "/organization" ? styles.active : ""} ${styles.orgLink}`}>
                  <FaBuilding /> Organization
                </Link>
              )}
              {canAccessOrgDashboard && (
                <Link to="/manager-dashboard" className={`${location.pathname === "/manager-dashboard" ? styles.active : ""} ${styles.managerLink}`}>
                  <FaChartLine /> Monitoring
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className={`${location.pathname === "/admin" ? styles.active : ""} ${styles.adminLink}`}>
                  <FaUserShield /> Admin
                </Link>
              )}
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <FaSignOutAlt /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className={location.pathname === "/register" ? styles.active : ""}>
                Register
              </Link>
              <Link to="/login" className={location.pathname === "/login" ? styles.active : ""}>
                Login
              </Link>
            </>
          )}
          {/* <button
            className={styles.toggleBtn}
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button> */}
        </div>
      )}

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ""}`}>
        <Link to="/" className={location.pathname === "/" ? styles.active : ""}>
          Home
        </Link>
        <Link to="/contact" className={location.pathname === "/contact" ? styles.active : ""}>
          Contact Us
        </Link>
        {isLoggedIn ? (
          <>
            {username && (
              <div className={styles.userInfoMobile}>
                <span className={styles.userName}>{username}</span>
                {isOrgMember && <span className={styles.userRole}>({formatRole(userRole)})</span>}
              </div>
            )}
            <Link to="/dashboard" className={location.pathname === "/dashboard" ? styles.active : ""}>
              Dashboard
            </Link>
            {canAccessOrgDashboard && (
              <Link to="/organization" className={`${location.pathname === "/organization" ? styles.active : ""} ${styles.orgLink}`}>
                <FaBuilding /> Organization
              </Link>
            )}
            {canAccessOrgDashboard && (
              <Link to="/manager-dashboard" className={`${location.pathname === "/manager-dashboard" ? styles.active : ""} ${styles.managerLink}`}>
                <FaChartLine /> Monitoring
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={`${location.pathname === "/admin" ? styles.active : ""} ${styles.adminLink}`}>
                <FaUserShield /> Admin
              </Link>
            )}
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/register" className={location.pathname === "/register" ? styles.active : ""}>
              Register
            </Link>
            <Link to="/login" className={location.pathname === "/login" ? styles.active : ""}>
              Login
            </Link>
          </>
        )}
        {/* <button
          className={styles.toggleBtn}
          onClick={toggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </button> */}
      </div>
    </motion.nav>
  )
}

export default Navbar
