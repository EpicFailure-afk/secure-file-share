import styles from "./Toolbar.module.css";

/* Filter/search bar wrapper that lays out children responsively. */
const Toolbar = ({ children }) => (
  <div className={styles.toolbar}>{children}</div>
);

export default Toolbar;
