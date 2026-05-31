import { createContext, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaFile, FaFileAlt, FaFileImage, FaFilePdf, FaFileArchive, FaFileVideo,
  FaFileAudio, FaFileCode, FaFolder, FaRegClock, FaUser, FaHashtag,
} from "react-icons/fa";
import styles from "./HoverPreview.module.css";

const HOVER_DELAY = 2000; // ms — per spec, preview appears after 2 seconds
const CARD_W = 300;
const GAP = 12;

// eslint-disable-next-line react-refresh/only-export-components
export const HoverPreviewContext = createContext(null);

const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

const fileIconFor = (type = "") => {
  if (type.includes("image")) return <FaFileImage />;
  if (type.includes("pdf")) return <FaFilePdf />;
  if (type.includes("zip") || type.includes("rar")) return <FaFileArchive />;
  if (type.includes("video")) return <FaFileVideo />;
  if (type.includes("audio")) return <FaFileAudio />;
  if (type.includes("text") || type.includes("document")) return <FaFileAlt />;
  if (type.includes("javascript") || type.includes("html") || type.includes("css")) return <FaFileCode />;
  return <FaFile />;
};

const Row = ({ label, value }) =>
  value === undefined || value === null || value === "" ? null : (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );

const FilePreview = ({ file }) => {
  const isImage = (file.fileType || "").includes("image");
  return (
    <>
      {isImage && file.thumbnail && (
        <div className={styles.thumb}>
          <img src={file.thumbnail} alt={file.fileName} />
        </div>
      )}
      <div className={styles.head}>
        <span className={styles.headIcon}>{fileIconFor(file.fileType)}</span>
        <span className={styles.headName} title={file.fileName}>{file.fileName}</span>
      </div>
      <div className={styles.meta}>
        <Row label="Type" value={file.fileType || "Unknown"} />
        <Row label="Size" value={formatBytes(file.fileSize)} />
        <Row label="Uploaded" value={formatDate(file.uploadDate)} />
        <Row label="By" value={file.uploadedBy} />
        {file.imageWidth && file.imageHeight && (
          <Row label="Dimensions" value={`${file.imageWidth} × ${file.imageHeight}px`} />
        )}
        {file.pageCount ? <Row label="Pages" value={file.pageCount} /> : null}
      </div>
    </>
  );
};

const FolderPreview = ({ folder, count, size, children }) => (
  <>
    <div className={styles.head}>
      <span className={`${styles.headIcon} ${styles.folderIcon}`}><FaFolder /></span>
      <span className={styles.headName} title={folder.name}>{folder.name}</span>
    </div>
    <div className={styles.meta}>
      <div className={styles.metaRow}><span className={styles.metaLabel}><FaRegClock /> Created</span><span className={styles.metaValue}>{formatDate(folder.createdAt)}</span></div>
      <div className={styles.metaRow}><span className={styles.metaLabel}><FaHashtag /> Files</span><span className={styles.metaValue}>{count}</span></div>
      <div className={styles.metaRow}><span className={styles.metaLabel}><FaUser /> Size</span><span className={styles.metaValue}>{formatBytes(size)}</span></div>
    </div>
    {children && children.length > 0 && (
      <ul className={styles.miniList}>
        {children.slice(0, 5).map((f) => (
          <li key={f._id}><span className={styles.miniIcon}>{fileIconFor(f.fileType)}</span><span className={styles.miniName}>{f.fileName}</span></li>
        ))}
        {count > children.slice(0, 5).length && (
          <li className={styles.miniMore}>+{count - Math.min(children.length, 5)} more</li>
        )}
      </ul>
    )}
  </>
);

const PreviewCard = ({ payload, rect }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !rect) return;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right + GAP;
    if (left + CARD_W > vw - GAP) left = rect.left - CARD_W - GAP;
    if (left < GAP) left = Math.max(GAP, (vw - CARD_W) / 2);

    let top = rect.top;
    if (top + h > vh - GAP) top = vh - h - GAP;
    if (top < GAP) top = GAP;

    setPos({ left, top });
  }, [rect, payload]);

  return (
    <motion.div
      ref={ref}
      className={styles.card}
      style={{ left: pos.left, top: pos.top, width: CARD_W }}
      role="tooltip"
      initial={{ opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
    >
      {payload.kind === "folder" ? <FolderPreview {...payload} /> : <FilePreview file={payload.file} />}
    </motion.div>
  );
};

export const HoverPreviewProvider = ({ children, viewKey }) => {
  const [active, setActive] = useState(null); // { payload, rect }
  const timerRef = useRef(null);
  const draggingRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const hide = useCallback(() => {
    clearTimer();
    setActive(null);
  }, []);

  // The card is anchored to a row in the *current* view. Any navigation or
  // filter change (a new `viewKey`) swaps the underlying list, so an open card
  // would otherwise stay frozen over stale content — dismiss it on every change.
  useEffect(() => { hide(); }, [viewKey, hide]);

  // Delayed open used by mouse hover (suppressed while dragging)
  const schedule = useCallback((payload, el) => {
    if (draggingRef.current || !el) return;
    clearTimer();
    const rect = el.getBoundingClientRect();
    timerRef.current = setTimeout(() => setActive({ payload, rect }), HOVER_DELAY);
  }, []);

  // Immediate open used by the info button / keyboard
  const openNow = useCallback((payload, el) => {
    if (!el) return;
    clearTimer();
    setActive({ payload, rect: el.getBoundingClientRect() });
  }, []);

  const setDragging = useCallback((value) => {
    draggingRef.current = value;
    if (value) hide();
  }, [hide]);

  const value = { schedule, openNow, hide, setDragging };

  return (
    <HoverPreviewContext.Provider value={value}>
      {children}
      {createPortal(
        <AnimatePresence>
          {active && <PreviewCard key="preview" payload={active.payload} rect={active.rect} />}
        </AnimatePresence>,
        document.body,
      )}
    </HoverPreviewContext.Provider>
  );
};
