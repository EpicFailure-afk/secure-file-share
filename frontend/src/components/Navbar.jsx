"use client"

import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { FaSun, FaMoon, FaBars, FaTimes } from "react-icons/fa"
import styles from "./Navbar.module.css"
// You'll need to add your new logo file to the assets folder
// and update this import path
import logo from "../assets/image.png"

const Navbar = () => {
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true")
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

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

    window.addEventListener("resize", handleResize)
    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Close mobile menu when changing routes
  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
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
          <Link to="/register" className={location.pathname === "/register" ? styles.active : ""}>
            Register
          </Link>
          <Link to="/login" className={location.pathname === "/login" ? styles.active : ""}>
            Login
          </Link>
          <button
            className={styles.toggleBtn}
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      )}

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ""}`}>
        <Link to="/" className={location.pathname === "/" ? styles.active : ""}>
          Home
        </Link>
        <Link to="/register" className={location.pathname === "/register" ? styles.active : ""}>
          Register
        </Link>
        <Link to="/login" className={location.pathname === "/login" ? styles.active : ""}>
          Login
        </Link>
        <button
          className={styles.toggleBtn}
          onClick={toggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </div>
    </motion.nav>
  )
}

export default Navbar

