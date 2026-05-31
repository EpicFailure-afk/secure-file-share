import { FaExclamationTriangle, FaTrash } from "react-icons/fa";
import { Button } from "../../atoms";
import { Modal } from "../../molecules";
import styles from "./DeleteFileModal.module.css";

const DeleteFileModal = ({ open, onClose, file, onConfirm, submitting }) => (
  <Modal
    open={open}
    onClose={onClose}
    size="sm"
    showClose={false}
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="danger" leftIcon={<FaTrash />} loading={submitting} onClick={onConfirm}>
          Delete
        </Button>
      </>
    }
  >
    <div className={styles.body}>
      <span className={styles.iconWrap} aria-hidden="true">
        <FaExclamationTriangle />
      </span>
      <h2 className={styles.title}>Delete File?</h2>
      {file?.fileName && <p className={styles.fileName}>{file.fileName}</p>}
      <p className={styles.warning}>This action cannot be undone.</p>
    </div>
  </Modal>
);

export default DeleteFileModal;
