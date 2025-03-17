"use client"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import styles from "./Home.module.css"

const Home = () => {
  return (
    <div className={styles.homeContainer}>
      <motion.div
        className={styles.heroSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1 initial={{ y: -50 }} animate={{ y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          Secure File Sharing
          <span className={styles.highlight}> Made Simple</span>
        </motion.h1>

        <motion.p
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Share your files with confidence. End-to-end encryption, password protection, and expiring links keep your
          data safe.
        </motion.p>

        <motion.div
          className={styles.ctaButtons}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link to="/register" className={styles.primaryBtn}>
            Get Started
          </Link>
          <Link to="/login" className={styles.secondaryBtn}>
            Sign In
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className={styles.featuresSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        <h2>Why Choose Our Platform?</h2>

        <div className={styles.features}>
          <motion.div className={styles.featureCard} whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
            <div className={styles.featureIcon}>🔒</div>
            <h3>End-to-End Encryption</h3>
            <p>
              Your files are encrypted before they leave your device, ensuring only intended recipients can access them.
            </p>
          </motion.div>

          <motion.div className={styles.featureCard} whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
            <div className={styles.featureIcon}>⏱️</div>
            <h3>Expiring Links</h3>
            <p>Set an expiration time for your shared files to ensure they're not accessible indefinitely.</p>
          </motion.div>

          <motion.div className={styles.featureCard} whileHover={{ y: -10, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}>
            <div className={styles.featureIcon}>🚀</div>
            <h3>Fast Transfers</h3>
            <p>Upload and download files quickly with our optimized transfer technology.</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default Home

