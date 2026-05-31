import { useId } from "react";
import { cloneElement, isValidElement } from "react";
import styles from "./FormField.module.css";

const FormField = ({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  className = "",
  children,
  ...rest
}) => {
  const generatedId = useId();
  const id = htmlFor || generatedId;
  const hintId = hint || error ? `${id}-msg` : undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        invalid: Boolean(error) || children.props.invalid,
        "aria-describedby": hintId,
      })
    : children;

  return (
    <div className={`${styles.field} ${className}`} {...rest}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true">*</span>}
        </label>
      )}
      {control}
      {(error || hint) && (
        <p id={hintId} className={`${styles.msg} ${error ? styles.error : ""}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
};

export default FormField;
