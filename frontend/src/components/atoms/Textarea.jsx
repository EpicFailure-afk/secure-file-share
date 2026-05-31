import { forwardRef } from "react";
import styles from "./Input.module.css";

const Textarea = forwardRef(function Textarea(
  { invalid = false, rows = 4, className = "", ...rest },
  ref,
) {
  const cls = [styles.field, styles.size_md, styles.textarea, invalid && styles.invalid, className]
    .filter(Boolean)
    .join(" ");
  return <textarea ref={ref} rows={rows} className={cls} aria-invalid={invalid || undefined} {...rest} />;
});

export default Textarea;
