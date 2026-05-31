import { useState } from "react";
import { FaChevronRight, FaHome } from "react-icons/fa";
import styles from "./Breadcrumbs.module.css";

// trail: ordered array of { _id, name } from root-most to current (excludes the virtual root).
const Breadcrumbs = ({ trail = [], onNavigate, onDropFile }) => {
  const [overId, setOverId] = useState(undefined); // undefined = none, null = root

  const crumbProps = (id) => ({
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overId !== id) setOverId(id); },
    onDragLeave: () => setOverId(undefined),
    onDrop: (e) => {
      e.preventDefault();
      setOverId(undefined);
      const fileId = e.dataTransfer.getData("application/x-file-id") || e.dataTransfer.getData("text/plain");
      if (fileId) onDropFile?.(fileId, id);
    },
  });

  return (
    <nav className={styles.crumbs} aria-label="Folder path">
      <button
        className={`${styles.crumb} ${trail.length === 0 ? styles.current : ""} ${overId === null ? styles.over : ""}`}
        onClick={() => onNavigate?.(null)}
        {...crumbProps(null)}
      >
        <FaHome /> My files
      </button>
      {trail.map((f, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={f._id} className={styles.segment}>
            <FaChevronRight className={styles.sep} aria-hidden="true" />
            <button
              className={`${styles.crumb} ${isLast ? styles.current : ""} ${overId === f._id ? styles.over : ""}`}
              onClick={() => onNavigate?.(f._id)}
              {...crumbProps(f._id)}
            >
              {f.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
