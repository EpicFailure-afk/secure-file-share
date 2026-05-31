import { motion } from "framer-motion";
import { EmptyState } from "../../molecules";
import styles from "./DataTable.module.css";

/*
 * columns: [{ key, header, render?(row), align?, width? }]
 * rows:    array of objects
 * rowKey:  (row) => string
 */
const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const DataTable = ({ columns, rows, rowKey, empty }) => {
  if (!rows || rows.length === 0) {
    return empty || <EmptyState title="Nothing here yet" description="No records to display." />;
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align || "left", width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody variants={listVariants} initial="hidden" animate="visible">
          {rows.map((row) => (
            <motion.tr key={rowKey(row)} variants={rowVariants}>
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align || "left" }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  );
};

export default DataTable;
