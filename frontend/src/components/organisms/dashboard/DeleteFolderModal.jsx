import { FaExclamationTriangle, FaTrash } from "react-icons/fa";
import { Button } from "../../atoms";
import { Modal } from "../../molecules";
import styles from "./DeleteFileModal.module.css";

const DeleteFolderModal = ({ open, onClose, folder, fileCount = 0, onConfirm, submitting }) => (
  <Modal
    open={open}
    onClose={onClose}
    size="sm"
    showClose={false}
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="danger" leftIcon={<FaTrash />} loading={submitting} onClick={onConfirm}>
          Delete folder
        </Button>
      </>
    }
  >
    <div className={styles.body}>
      <span className={styles.iconWrap} aria-hidden="true">
        <FaExclamationTriangle />
      </span>
      <h2 className={styles.title}>Delete Folder?</h2>
      {folder?.name && <p className={styles.fileName}>{folder.name}</p>}
      <p className={styles.warning}>
        {fileCount > 0
          ? `This will permanently delete the folder and all ${fileCount} ${fileCount === 1 ? "file" : "files"} inside it. This action cannot be undone.`
          : "This action cannot be undone."}
      </p>
    </div>
  </Modal>
);

export default DeleteFolderModal;
