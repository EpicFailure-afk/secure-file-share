"use client"

import { FaGithub, FaLinkedin, FaTwitter, FaHeart } from "react-icons/fa"
import { motion } from "framer-motion"
import styles from "./Footer.module.css"

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <h3>SecureShare</h3>
          <p>Secure file sharing made simple</p>
        </div>

        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Blog</a>
          </div>

          <div className={styles.linkGroup}>
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Contact Us</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>&copy; {new Date().getFullYear()} SecureShare. All rights reserved.</p>

        <div className={styles.socialIcons}>
          <motion.a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -5, color: "#ff8a00" }}
          >
            <FaGithub />
          </motion.a>
          <motion.a
            href="https://linkedin.com/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -5, color: "#ff8a00" }}
          >
            <FaLinkedin />
          </motion.a>
          <motion.a
            href="https://twitter.com/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -5, color: "#ff8a00" }}
          >
            <FaTwitter />
          </motion.a>
        </div>

        <p className={styles.love}>
          Made with <FaHeart className={styles.heart} /> by SecureShare Team
        </p>
      </div>
    </footer>
  )
}

export default Footer

