import styles from "./EmptyState.module.css";

const EmptyState = ({
  icon,
  title,
  description,
  action,
  variant = "default",
  className = "",
  ...rest
}) => (
  <div className={`${styles.wrap} ${styles[variant]} ${className}`} {...rest}>
    {icon && <div className={styles.icon}>{icon}</div>}
    {title && <h3 className={styles.title}>{title}</h3>}
    {description && <p className={styles.description}>{description}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);

export default EmptyState;
