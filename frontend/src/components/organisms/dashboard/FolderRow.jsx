import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaFolder, FaChevronRight, FaFolderOpen, FaPen, FaTrash, FaInfoCircle } from "react-icons/fa";
import { IconButton } from "../../atoms";
import { useHoverPreview } from "./useHoverPreview";
import ActionMenu from "./ActionMenu";
import styles from "./FolderRow.module.css";

const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const FolderRow = ({ folder, count = 0, size = 0, previewChildren = [], onOpen, onRename, onDelete, onDropFile }) => {
  const [dragOver, setDragOver] = useState(false);
  const rowRef = useRef(null);
  const preview = useHoverPreview();

  const payload = { kind: "folder", folder, count, size, children: previewChildren };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const fileId = e.dataTransfer.getData("application/x-file-id") || e.dataTransfer.getData("text/plain");
    if (fileId) onDropFile?.(fileId, folder._id);
  };

  return (
    <motion.article
      ref={rowRef}
      className={`${styles.row} ${dragOver ? styles.dragOver : ""}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => preview?.schedule(payload, rowRef.current)}
      onMouseLeave={() => preview?.hide()}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!dragOver) setDragOver(true); }}
      onDragLeave={(e) => { if (!rowRef.current?.contains(e.relatedTarget)) setDragOver(false); }}
      onDrop={handleDrop}
    >
      <button className={styles.openBtn} onClick={() => onOpen?.(folder)} aria-label={`Open folder ${folder.name}`}>
        <span className={styles.icon}><FaFolder /></span>
        <span className={styles.meta}>
          <span className={styles.name} title={folder.name}>{folder.name}</span>
          <span className={styles.sub}>{count} {count === 1 ? "file" : "files"} · {formatBytes(size)}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true"><FaChevronRight /></span>
      </button>

      <div className={styles.actions}>
        <IconButton
          aria-label={`Folder details for ${folder.name}`}
          variant="ghost"
          size="md"
          onClick={(e) => { e.stopPropagation(); preview?.openNow(payload, e.currentTarget); }}
        >
          <FaInfoCircle />
        </IconButton>
        <ActionMenu label={`Folder actions for ${folder.name}`}>
          {(close) => (
            <>
              <button role="menuitem" onClick={() => { close(); onOpen?.(folder); }}><FaFolderOpen /> Open</button>
              <button role="menuitem" onClick={() => { close(); onRename?.(folder); }}><FaPen /> Rename</button>
              <button role="menuitem" data-variant="danger" onClick={() => { close(); onDelete?.(folder); }}><FaTrash /> Delete</button>
            </>
          )}
        </ActionMenu>
      </div>
    </motion.article>
  );
};

export default FolderRow;
