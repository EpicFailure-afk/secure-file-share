import styles from "./Divider.module.css";

const Divider = ({ orientation = "horizontal", label, className = "", ...rest }) => {
  if (label) {
    return (
      <div className={`${styles.labelled} ${className}`} role="separator" {...rest}>
        <span className={styles.line} />
        <span className={styles.label}>{label}</span>
        <span className={styles.line} />
      </div>
    );
  }
  return (
    <hr
      className={`${styles.divider} ${styles[orientation]} ${className}`}
      role="separator"
      aria-orientation={orientation}
      {...rest}
    />
  );
};

export default Divider;
