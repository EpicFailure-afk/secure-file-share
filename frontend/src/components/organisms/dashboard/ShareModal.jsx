import { useState } from "react";
import { FaCheck, FaCopy, FaInfoCircle } from "react-icons/fa";
import { Button, IconButton, Input } from "../../atoms";
import { Modal } from "../../molecules";
import styles from "./Modals.module.css";

const ShareModal = ({ open, onClose, file, shareUrl }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={file ? `Share "${file.fileName}"` : "Share file"}
      description="Send this link to your recipient. They'll request access and you'll approve it with a one-time code."
      footer={<Button variant="ghost" onClick={onClose}>Done</Button>}
    >
      <p className={styles.infoBox}>
        <FaInfoCircle />
        <span>
          When the recipient opens this link they need to <strong>request access</strong>.
          You&apos;ll then receive a verification code by email to share with them.
        </span>
      </p>

      <div className={styles.copyRow}>
        <Input value={shareUrl || ""} readOnly />
        <IconButton aria-label="Copy share link" variant="brand" size="md" onClick={copy}>
          {copied ? <FaCheck /> : <FaCopy />}
        </IconButton>
      </div>
    </Modal>
  );
};

export default ShareModal;
