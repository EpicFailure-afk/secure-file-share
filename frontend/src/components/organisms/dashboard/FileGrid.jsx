import { motion } from "framer-motion";
import FileRow from "./FileRow";
import FolderRow from "./FolderRow";
import styles from "./FileGrid.module.css";

const list = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] } },
};

const FileGrid = ({
  folders = [],
  files = [],
  downloadingId,
  ownerName,
  folderStats,
  fileHandlers,
  folderHandlers,
}) => (
  <motion.div className={styles.grid} variants={list} initial="hidden" animate="visible">
    {folders.map((folder) => {
      const stats = folderStats ? folderStats(folder._id) : { count: 0, size: 0, children: [] };
      return (
        <motion.div key={`folder-${folder._id}`} variants={item}>
          <FolderRow
            folder={folder}
            count={stats.count}
            size={stats.size}
            previewChildren={stats.children}
            {...folderHandlers}
          />
        </motion.div>
      );
    })}
    {files.map((file) => (
      <motion.div key={`file-${file._id}`} variants={item}>
        <FileRow file={file} downloading={downloadingId === file._id} ownerName={ownerName} {...fileHandlers} />
      </motion.div>
    ))}
  </motion.div>
);

export default FileGrid;
