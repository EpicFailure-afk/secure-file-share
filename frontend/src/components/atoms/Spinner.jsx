import styles from "./Spinner.module.css";

const sizeMap = { xs: 14, sm: 18, md: 24, lg: 32, xl: 48 };

const Spinner = ({ size = "md", tone = "brand", className = "", label = "Loading", ...rest }) => {
  const px = sizeMap[size] || size;
  return (
    <span
      className={`${styles.spinner} ${styles[`tone_${tone}`] || ""} ${className}`}
      style={{ width: px, height: px }}
      role="status"
      aria-label={label}
      {...rest}
    />
  );
};

export default Spinner;
