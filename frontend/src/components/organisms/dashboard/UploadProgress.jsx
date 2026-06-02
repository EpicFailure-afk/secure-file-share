import { motion, AnimatePresence } from "framer-motion";
import { FaCloudUploadAlt, FaShieldAlt } from "react-icons/fa";
import styles from "./UploadProgress.module.css";

const UploadProgress = ({ progress, fileName, visible, phase = "uploading" }) => {
  const scanning = phase === "scanning";
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`${styles.wrap} ${scanning ? styles.scanning : ""}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {scanning ? (
            <>
              <span className={`${styles.icon} ${styles.iconScan}`} aria-hidden="true">
                <FaShieldAlt />
              </span>
              <div className={styles.meta}>
                <p className={styles.title}>
                  <strong>Scanning for threats…</strong>
                </p>
                <div className={styles.scanTrack}>
                  <span className={styles.scanLine} />
                </div>
              </div>
              <span className={styles.scanTag}>Security scan</span>
            </>
          ) : (
            <>
              <span className={styles.icon} aria-hidden="true">
                <FaCloudUploadAlt />
              </span>
              <div className={styles.meta}>
                <p className={styles.title}>
                  Uploading {fileName ? <strong>{fileName}</strong> : "your file"}… please wait
                </p>
                <div className={styles.barOuter}>
                  <motion.div
                    className={styles.barInner}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.25 }}
                  />
                </div>
              </div>
              <span className={styles.percent}>{progress}%</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UploadProgress;
