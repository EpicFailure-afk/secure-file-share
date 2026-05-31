import { Skeleton } from "../../atoms";
import styles from "./FileListSkeleton.module.css";

const FileListSkeleton = ({ rows = 4 }) => (
  <div className={styles.list} aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={styles.row}>
        <Skeleton variant="rect" width={44} height={44} radius="var(--radius-md)" />
        <div className={styles.meta}>
          <Skeleton variant="text" height={14} width={`${40 + (i * 7) % 40}%`} />
          <Skeleton variant="text" height={10} width="32%" style={{ marginTop: 8 }} />
          <div className={styles.badges}>
            <Skeleton variant="rect" width={64} height={20} radius="var(--radius-pill)" />
            <Skeleton variant="rect" width={88} height={20} radius="var(--radius-pill)" />
          </div>
        </div>
        <div className={styles.actions}>
          <Skeleton variant="circle" width={36} height={36} />
          <Skeleton variant="circle" width={36} height={36} />
          <Skeleton variant="circle" width={36} height={36} />
        </div>
      </div>
    ))}
  </div>
);

export default FileListSkeleton;
