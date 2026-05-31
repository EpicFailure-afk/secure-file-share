import { Skeleton } from "../../atoms";
import styles from "./TableSkeleton.module.css";

const TableSkeleton = ({ rows = 6, cols = 5 }) => (
  <div className={styles.wrap} aria-hidden="true">
    <div className={styles.headRow}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" height={12} width="60%" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className={styles.row}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} variant="text" height={14} width={c === 0 ? "80%" : "55%"} />
        ))}
      </div>
    ))}
  </div>
);

export default TableSkeleton;
