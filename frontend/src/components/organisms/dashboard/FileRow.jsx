import { useRef } from "react";
import { motion } from "framer-motion";
import {
  FaDownload, FaShare, FaTrash, FaFile, FaFileAlt, FaFileImage,
  FaFilePdf, FaFileArchive, FaFileVideo, FaFileAudio, FaFileCode,
  FaShieldAlt, FaVirus, FaClock, FaExclamationTriangle, FaLock, FaUnlock, FaKey,
  FaInfoCircle, FaFolderOpen,
} from "react-icons/fa";
import { IconButton, Badge, Spinner } from "../../atoms";
import { useHoverPreview } from "./useHoverPreview";
import ActionMenu from "./ActionMenu";
import styles from "./FileRow.module.css";

const fileIconFor = (type = "") => {
  if (type.includes("image"))    return <FaFileImage />;
  if (type.includes("pdf"))      return <FaFilePdf />;
  if (type.includes("zip") || type.includes("rar")) return <FaFileArchive />;
  if (type.includes("video"))    return <FaFileVideo />;
  if (type.includes("audio"))    return <FaFileAudio />;
  if (type.includes("text") || type.includes("document")) return <FaFileAlt />;
  if (type.includes("javascript") || type.includes("html") || type.includes("css")) return <FaFileCode />;
  return <FaFile />;
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : null);

const ScanBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    clean:    { variant: "success", icon: <FaShieldAlt />, label: "Clean" },
    infected: { variant: "danger",  icon: <FaVirus />,     label: "Infected" },
    pending:  { variant: "warning", icon: <FaClock />,     label: "Pending scan" },
    scanning: { variant: "info",    icon: <FaClock />,     label: "Scanning…" },
    error:    { variant: "warning", icon: <FaExclamationTriangle />, label: "Scan error" },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <Badge variant={cfg.variant} size="sm">
      <span className={styles.badgeIcon}>{cfg.icon}</span> {cfg.label}
    </Badge>
  );
};

const FileRow = ({ file, downloading, ownerName, onDownload, onShare, onDelete, onLockToggle, onSetExpiration, onVerifyIntegrity, onMove }) => {
  const rowRef = useRef(null);
  const preview = useHoverPreview();

  const payload = { kind: "file", file: { ...file, uploadedBy: ownerName } };

  const disabledDownload = file.scanStatus === "infected" || Boolean(downloading);

  return (
    <motion.article
      ref={rowRef}
      className={styles.row}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-file-id", file._id);
        e.dataTransfer.setData("text/plain", file._id);
        preview?.setDragging(true);
      }}
      onDragEnd={() => preview?.setDragging(false)}
      onMouseEnter={() => preview?.schedule(payload, rowRef.current)}
      onMouseLeave={() => preview?.hide()}
    >
      <div className={styles.icon}>{fileIconFor(file.fileType)}</div>

      <div className={styles.meta}>
        <h3 className={styles.name} title={file.fileName}>{file.fileName}</h3>
        <p className={styles.sub}>
          {formatBytes(file.fileSize)} · uploaded {formatDate(file.uploadDate)}
        </p>
        <div className={styles.badges}>
          <ScanBadge status={file.scanStatus} />
          {file.isLocked && (
            <Badge variant="warning" size="sm">
              <span className={styles.badgeIcon}><FaLock /></span> Locked
            </Badge>
          )}
          {file.integrityVerified === false && (
            <Badge variant="danger" size="sm">
              <span className={styles.badgeIcon}><FaExclamationTriangle /></span> Integrity check failed
            </Badge>
          )}
          {file.expiresAt && (
            <Badge variant="info" size="sm">
              <span className={styles.badgeIcon}><FaClock /></span> Expires {formatDate(file.expiresAt)}
            </Badge>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <IconButton
          aria-label={`Download ${file.fileName}`}
          variant="ghost"
          size="md"
          disabled={disabledDownload}
          onClick={() => onDownload(file)}
        >
          {downloading ? <Spinner size="sm" /> : <FaDownload />}
        </IconButton>
        <IconButton aria-label={`Share ${file.fileName}`} variant="ghost" size="md" onClick={() => onShare(file)}>
          <FaShare />
        </IconButton>
        <IconButton
          aria-label={`Details for ${file.fileName}`}
          variant="ghost"
          size="md"
          onClick={(e) => { e.stopPropagation(); preview?.openNow(payload, e.currentTarget); }}
        >
          <FaInfoCircle />
        </IconButton>
        <IconButton aria-label={`Delete ${file.fileName}`} variant="danger" size="md" onClick={() => onDelete(file)}>
          <FaTrash />
        </IconButton>
        <ActionMenu label={`More actions for ${file.fileName}`}>
          {(close) => (
            <>
              <button role="menuitem" onClick={() => { close(); onMove?.(file); }}>
                <FaFolderOpen /> Move to…
              </button>
              <button role="menuitem" onClick={() => { close(); onVerifyIntegrity(file); }}>
                <FaShieldAlt /> Verify integrity
              </button>
              <button role="menuitem" onClick={() => { close(); onSetExpiration(file); }}>
                <FaClock /> Set expiration
              </button>
              <button role="menuitem" onClick={() => { close(); onLockToggle(file); }}>
                {file.isLocked ? <><FaUnlock /> Unlock file</> : <><FaKey /> Lock file</>}
              </button>
            </>
          )}
        </ActionMenu>
      </div>
    </motion.article>
  );
};

export default FileRow;
