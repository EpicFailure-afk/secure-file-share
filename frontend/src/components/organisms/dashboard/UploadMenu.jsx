import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaUpload, FaChevronDown, FaFileUpload, FaFolderPlus } from "react-icons/fa";
import { Button } from "../../atoms";
import styles from "./UploadMenu.module.css";

const UploadMenu = ({ onUpload, uploading, size = "lg" }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const pick = (ref) => { setOpen(false); ref.current?.click(); };

  const handleChange = (isFolder) => (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onUpload?.(files, { folder: isFolder });
    e.target.value = "";
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <Button
        variant="primary"
        size={size}
        leftIcon={<FaUpload />}
        rightIcon={<FaChevronDown className={`${styles.caret} ${open ? styles.caretOpen : ""}`} />}
        loading={uploading}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {uploading ? "Uploading" : "Upload"}
      </Button>

      {open && (
        <motion.div
          role="menu"
          className={styles.menu}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <button role="menuitem" onClick={() => pick(fileInputRef)}>
            <FaFileUpload /> Upload File
          </button>
          <button role="menuitem" onClick={() => pick(folderInputRef)}>
            <FaFolderPlus /> Upload Folder
          </button>
        </motion.div>
      )}

      <input ref={fileInputRef} type="file" multiple className={styles.hidden} onChange={handleChange(false)} aria-hidden="true" tabIndex={-1} />
      <input ref={folderInputRef} type="file" webkitdirectory="" multiple className={styles.hidden} onChange={handleChange(true)} aria-hidden="true" tabIndex={-1} />
    </div>
  );
};

export default UploadMenu;
