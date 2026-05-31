import { motion } from "framer-motion";
import { Card } from "../../atoms";
import styles from "./StatCard.module.css";

/* tone: brand | info | success | warning | danger | violet */
const StatCard = ({ icon, label, value, detail, tone = "brand" }) => (
  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
    <Card variant="surface" elevation={1} padding="md" className={styles.card}>
      <div className={`${styles.icon} ${styles[`tone_${tone}`]}`}>{icon}</div>
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {detail && <p className={styles.detail}>{detail}</p>}
      </div>
    </Card>
  </motion.div>
);

export default StatCard;
