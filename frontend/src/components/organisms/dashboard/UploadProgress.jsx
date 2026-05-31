import { motion, AnimatePresence } from "framer-motion";
import { FaCloudUploadAlt } from "react-icons/fa";
import styles from "./UploadProgress.module.css";

const UploadProgress = ({ progress, fileName, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className={styles.wrap}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
      >
        <span className={styles.icon}><FaCloudUploadAlt /></span>
        <div className={styles.meta}>
          <p className={styles.title}>
            Uploading {fileName ? <strong>{fileName}</strong> : "your file"}
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
      </motion.div>
    )}
  </AnimatePresence>
);

export default UploadProgress;
