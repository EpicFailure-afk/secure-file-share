import { motion } from "framer-motion";
import styles from "./StatGrid.module.css";

const grid = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const StatGrid = ({ children }) => (
  <motion.div className={styles.grid} variants={grid} initial="hidden" animate="visible">
    {children}
  </motion.div>
);

export default StatGrid;
