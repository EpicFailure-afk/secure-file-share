import styles from "./Badge.module.css";

const Badge = ({ variant = "neutral", size = "md", pill = true, dot = false, className = "", children, ...rest }) => {
  const cls = [
    styles.badge,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    pill && styles.pill,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={cls} {...rest}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
};

export default Badge;
