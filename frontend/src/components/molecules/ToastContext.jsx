import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import IconButton from "../atoms/IconButton";
import styles from "./Toast.module.css";

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext(null);

const iconFor = {
  success: <FaCheckCircle />,
  danger:  <FaExclamationCircle />,
  warning: <FaExclamationTriangle />,
  info:    <FaInfoCircle />,
};

const Toast = ({ toast, onDismiss }) => {
  const { id, variant = "info", title, description, action } = toast;
  return (
    <motion.div
      role="status"
      aria-live="polite"
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className={`${styles.toast} ${styles[`variant_${variant}`]}`}
    >
      <span className={styles.icon}>{iconFor[variant]}</span>
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {description && <p className={styles.description}>{description}</p>}
        {action && <div className={styles.action}>{action}</div>}
      </div>
      <IconButton size="sm" variant="ghost" aria-label="Dismiss notification" onClick={() => onDismiss(id)}>
        <FaTimes />
      </IconButton>
    </motion.div>
  );
};

export const ToastProvider = ({ children, max = 4, defaultDuration = 4500 }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) clearTimeout(handle);
    timers.current.delete(id);
  }, []);

  const push = useCallback((toast) => {
    const id = toast.id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((cur) => [{ ...toast, id }, ...cur].slice(0, max));
    const duration = toast.duration ?? defaultDuration;
    if (duration > 0) {
      const handle = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, handle);
    }
    return id;
  }, [defaultDuration, dismiss, max]);

  useEffect(() => () => {
    timers.current.forEach((handle) => clearTimeout(handle));
    timers.current.clear();
  }, []);

  const api = useMemo(() => ({
    toast: push,
    success: (t) => push({ variant: "success", ...t }),
    error:   (t) => push({ variant: "danger",  ...t }),
    warning: (t) => push({ variant: "warning", ...t }),
    info:    (t) => push({ variant: "info",    ...t }),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className={styles.viewport} aria-live="polite" aria-relevant="additions text">
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <Toast key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};
