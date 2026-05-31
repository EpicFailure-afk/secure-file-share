import { forwardRef } from "react";
import styles from "./IconButton.module.css";

const IconButton = forwardRef(function IconButton(
  { variant = "ghost", size = "md", round = true, className = "", "aria-label": ariaLabel, children, ...rest },
  ref,
) {
  const cls = [
    styles.btn,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    round && styles.round,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} type="button" className={cls} aria-label={ariaLabel} {...rest}>
      {children}
    </button>
  );
});

export default IconButton;
