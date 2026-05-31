import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { IconButton } from "../../atoms";
import styles from "./Pagination.module.css";

const Pagination = ({ page, pages, onChange }) => {
  if (!pages || pages <= 1) return null;

  // windowed page numbers around the current page
  const nums = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i += 1) nums.push(i);

  return (
    <nav className={styles.wrap} aria-label="Pagination">
      <IconButton aria-label="Previous page" variant="glass" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <FaChevronLeft />
      </IconButton>

      {nums.map((n) => (
        <button
          key={n}
          className={`${styles.page} ${n === page ? styles.active : ""}`}
          aria-current={n === page ? "page" : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}

      <IconButton aria-label="Next page" variant="glass" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <FaChevronRight />
      </IconButton>
    </nav>
  );
};

export default Pagination;
