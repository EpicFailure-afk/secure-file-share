import { forwardRef } from "react";
import styles from "./Input.module.css";

const Input = forwardRef(function Input(
  {
    leftIcon,
    rightSlot,
    size = "md",
    invalid = false,
    className = "",
    type = "text",
    ...rest
  },
  ref,
) {
  const cls = [
    styles.field,
    styles[`size_${size}`],
    invalid && styles.invalid,
    leftIcon && styles.hasLeft,
    rightSlot && styles.hasRight,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrap}>
      {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
      <input ref={ref} type={type} className={cls} aria-invalid={invalid || undefined} {...rest} />
      {rightSlot && <span className={styles.rightSlot}>{rightSlot}</span>}
    </div>
  );
});

export default Input;
