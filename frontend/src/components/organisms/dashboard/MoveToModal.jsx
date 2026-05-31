import { useEffect, useMemo, useState } from "react";
import { FaFolder, FaHome, FaCheck } from "react-icons/fa";
import { Button } from "../../atoms";
import { Modal } from "../../molecules";
import styles from "./MoveToModal.module.css";

// Flatten the folder list into a depth-ordered array for indented display.
const flattenFolders = (folders) => {
  const childrenOf = new Map();
  for (const f of folders) {
    const key = String(f.parentFolder || "root");
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(f);
  }
  const out = [];
  const walk = (parentKey, depth) => {
    const kids = (childrenOf.get(parentKey) || []).sort((a, b) => a.name.localeCompare(b.name));
    for (const f of kids) {
      out.push({ ...f, depth });
      walk(String(f._id), depth + 1);
    }
  };
  walk("root", 0);
  return out;
};

const MoveToModal = ({ open, onClose, file, folders = [], onConfirm, submitting }) => {
  const flat = useMemo(() => flattenFolders(folders), [folders]);
  const currentFolderId = file?.folderId ? String(file.folderId) : null;
  const [selected, setSelected] = useState(currentFolderId);

  // Re-sync selection whenever a different file is opened
  useEffect(() => { setSelected(currentFolderId); }, [file?._id, currentFolderId]);

  const destinations = [{ _id: null, name: "My files", depth: 0, root: true }, ...flat];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move to…"
      description={file ? `Choose a destination for "${file.fileName}".` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={selected === currentFolderId}
            onClick={() => onConfirm?.(selected)}
          >
            Move here
          </Button>
        </>
      }
    >
      <ul className={styles.list}>
        {destinations.map((d) => {
          const id = d._id ? String(d._id) : null;
          const isCurrent = id === currentFolderId;
          const isSelected = id === selected;
          return (
            <li key={id || "root"}>
              <button
                className={`${styles.item} ${isSelected ? styles.selected : ""}`}
                style={{ paddingLeft: `calc(var(--space-3) + ${d.depth * 16}px)` }}
                onClick={() => setSelected(id)}
                disabled={isCurrent}
              >
                <span className={styles.icon}>{d.root ? <FaHome /> : <FaFolder />}</span>
                <span className={styles.name}>{d.name}</span>
                {isCurrent && <span className={styles.hint}>current</span>}
                {isSelected && !isCurrent && <FaCheck className={styles.check} />}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
};

export default MoveToModal;
