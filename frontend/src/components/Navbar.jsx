import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBars, FaTimes, FaSignOutAlt, FaUserShield, FaBuilding, FaChartLine } from "react-icons/fa";
import styles from "./Navbar.module.css";
import { useAuth } from "../auth/useAuth";
import ThemeToggle from "./ThemeToggle";
import LogoMark from "./LogoMark";

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
          <LogoMark className={styles.logoImage} />
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
