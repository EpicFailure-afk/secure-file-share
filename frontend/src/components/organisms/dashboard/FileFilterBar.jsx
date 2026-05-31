import { FaThLarge, FaFileAlt, FaFolder } from "react-icons/fa";
import styles from "./FileFilterBar.module.css";

const OPTIONS = [
  { id: "all", label: "All", icon: <FaThLarge /> },
  { id: "files", label: "Files only", icon: <FaFileAlt /> },
  { id: "folders", label: "Folders only", icon: <FaFolder /> },
];

const FileFilterBar = ({ value, onChange }) => (
  <div className={styles.bar} role="tablist" aria-label="Filter items">
    {OPTIONS.map((opt) => (
      <button
        key={opt.id}
        role="tab"
        aria-selected={value === opt.id}
        className={`${styles.tab} ${value === opt.id ? styles.active : ""}`}
        onClick={() => onChange?.(opt.id)}
      >
        <span className={styles.icon}>{opt.icon}</span>
        {opt.label}
      </button>
    ))}
  </div>
);

export default FileFilterBar;
