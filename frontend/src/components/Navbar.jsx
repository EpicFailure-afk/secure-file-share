import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBars, FaTimes, FaSignOutAlt, FaUserShield, FaBuilding, FaChartLine } from "react-icons/fa";
import styles from "./Navbar.module.css";
import { useAuth } from "../auth/useAuth";
import ThemeToggle from "./ThemeToggle";

const LogoMark = () => (
  <svg
    className={styles.logoImage}
    viewBox="0 0 32 32"
    role="img"
    aria-label="SecureShare"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="ssLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff8a00" />
        <stop offset="1" stopColor="#e52e71" />
      </linearGradient>
    </defs>
    {/* Shield */}
    <path
      d="M16 2.5l10.5 3.8v8.2c0 6.6-4.3 12.3-10.5 14.5C9.8 26.8 5.5 21.1 5.5 14.5V6.3L16 2.5z"
      fill="url(#ssLogoGrad)"
    />
    {/* Lock body */}
    <rect x="11" y="15" width="10" height="8" rx="1.8" fill="#fff" />
    {/* Lock shackle */}
    <path
      d="M12.7 15v-2.2a3.3 3.3 0 016.6 0V15"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Keyhole */}
    <circle cx="16" cy="18.4" r="1.4" fill="url(#ssLogoGrad)" />
    <rect x="15.4" y="18.4" width="1.2" height="2.6" rx="0.6" fill="url(#ssLogoGrad)" />
  </svg>
);

const ROLE_LABELS = {
  staff: "Staff",
  manager: "Manager",
  admin: "Admin",
  owner: "Owner",
  superadmin: "Super Admin",
};

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, isAuthed, logout } = useAuth();

  const username = user?.username || "";
  const userRole = user?.role || "";
  const isAdmin = user?.role === "superadmin";
  const isOrgMember = Boolean(user?.organization);
  const canAccessOrgDashboard = isOrgMember && ["admin", "owner", "manager"].includes(user?.role);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const renderLinks = (mobile = false) => (
    <>
      <Link to="/" className={location.pathname === "/" ? styles.active : ""}>Home</Link>
      <Link to="/contact" className={location.pathname === "/contact" ? styles.active : ""}>Contact Us</Link>
      {isAuthed ? (
        <>
          {username && (
            <div className={mobile ? styles.userInfoMobile : styles.userInfo}>
              <span className={styles.userName}>{username}</span>
              {isOrgMember && <span className={styles.userRole}>({ROLE_LABELS[userRole] || userRole})</span>}
            </div>
          )}
          <Link to="/dashboard" className={location.pathname === "/dashboard" ? styles.active : ""}>Dashboard</Link>
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
          <button className={styles.logoutBtn} onClick={logout}>
            <FaSignOutAlt /> Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/register" className={location.pathname === "/register" ? styles.active : ""}>Register</Link>
          <Link to="/login" className={location.pathname === "/login" ? styles.active : ""}>Login</Link>
        </>
      )}
    </>
  );

  return (
    <motion.nav
      className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.logo}>
        <Link to="/">
          <LogoMark />
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
          {renderLinks(false)}
          <ThemeToggle />
        </div>
      )}

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ""}`}>
        {renderLinks(true)}
        <div className={styles.mobileToggleWrap}>
          <ThemeToggle />
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
