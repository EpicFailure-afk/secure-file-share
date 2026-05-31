import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import IconButton from "../atoms/IconButton";
import styles from "./Modal.module.css";

const sizes = { sm: 420, md: 560, lg: 720, xl: 960 };

const Modal = ({
  open,
  onClose,
  title,
  description,
  size = "md",
  closeOnBackdrop = true,
  closeOnEsc = true,
  showClose = true,
  footer,
  children,
}) => {
  const dialogRef = useRef(null);
  const lastActive = useRef(null);

  useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && closeOnEsc) onClose?.();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      if (lastActive.current && lastActive.current.focus) lastActive.current.focus();
    };
  }, [open, closeOnEsc, onClose]);

  const node = (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            aria-describedby={description ? "modal-desc" : undefined}
            tabIndex={-1}
            className={styles.dialog}
            style={{ maxWidth: sizes[size] || sizes.md }}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          >
            {(title || showClose) && (
              <header className={styles.header}>
                <div className={styles.titles}>
                  {title && (
                    <h2 id="modal-title" className={styles.title}>{title}</h2>
                  )}
                  {description && (
                    <p id="modal-desc" className={styles.description}>{description}</p>
                  )}
                </div>
                {showClose && (
                  <IconButton aria-label="Close" onClick={onClose} variant="ghost" size="sm">
                    <FaTimes />
                  </IconButton>
                )}
              </header>
            )}
            <div className={styles.body}>{children}</div>
            {footer && <footer className={styles.footer}>{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
};

export default Modal;
