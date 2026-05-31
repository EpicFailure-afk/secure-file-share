import { forwardRef } from "react";
import styles from "./Button.module.css";
import Spinner from "./Spinner";

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    full = false,
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const cls = [
    styles.btn,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    full && styles.full,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner size="sm" className={styles.spinner} />}
      {!loading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
      <span className={styles.label}>{children}</span>
      {!loading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
    </button>
  );
});

export default Button;
