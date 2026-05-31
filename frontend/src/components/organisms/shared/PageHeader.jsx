import { motion } from "framer-motion";
import styles from "./PageHeader.module.css";

const PageHeader = ({ icon, title, subtitle, actions }) => (
  <motion.header
    className={styles.header}
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
  >
    <div className={styles.left}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </motion.header>
);

export default PageHeader;
