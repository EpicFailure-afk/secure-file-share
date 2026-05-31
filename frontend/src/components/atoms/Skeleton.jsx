import styles from "./Skeleton.module.css";

const Skeleton = ({
  variant = "rect",
  width,
  height,
  radius,
  lines = 1,
  className = "",
  style,
  ...rest
}) => {
  if (variant === "text" && lines > 1) {
    return (
      <span className={`${styles.textBlock} ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={`${styles.sk} ${styles.text}`}
            style={{
              width: i === lines - 1 ? "65%" : "100%",
              height: height || 12,
              borderRadius: radius || "var(--radius-sm)",
            }}
          />
        ))}
      </span>
    );
  }

  const baseStyle = {
    width,
    height,
    borderRadius:
      radius ||
      (variant === "circle" ? "50%" : variant === "text" ? "var(--radius-sm)" : "var(--radius-md)"),
    ...style,
  };

  return (
    <span
      className={`${styles.sk} ${styles[variant]} ${className}`}
      style={baseStyle}
      aria-hidden="true"
      {...rest}
    />
  );
};

export default Skeleton;
