import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaEllipsisV } from "react-icons/fa";
import { IconButton } from "../../atoms";
import styles from "./ActionMenu.module.css";

const MENU_W = 200;
const GAP = 4;

/**
 * A three-dots action menu whose dropdown is rendered in a portal on
 * document.body and anchored to the trigger button via getBoundingClientRect.
 * Portaling keeps the menu out of the row's stacking/overflow context so it
 * always floats above sibling rows and even the hover preview card.
 *
 * `children` is a render prop: it receives a `close` callback so menu items
 * can dismiss the menu after firing their action.
 */
const ActionMenu = ({ label = "More actions", children }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h = menuRef.current?.offsetHeight || 0;

    // Anchor the menu's right edge to the trigger's right edge, then clamp.
    let left = rect.right - MENU_W;
    if (left + MENU_W > vw - GAP) left = vw - MENU_W - GAP;
    if (left < GAP) left = GAP;

    // Open below the trigger; flip above if it would overflow the viewport.
    let top = rect.bottom + GAP;
    if (h && top + h > vh - GAP) top = rect.top - h - GAP;
    if (top < GAP) top = GAP;

    setPos({ left, top });
  }, []);

  // Position once mounted, and keep anchored on scroll/resize.
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onReflow = () => place();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, place]);

  // Dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <IconButton
        ref={triggerRef}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        variant="ghost"
        size="md"
        onClick={() => setOpen((o) => !o)}
      >
        <FaEllipsisV />
      </IconButton>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              role="menu"
              className={styles.menu}
              style={{ left: pos.left, top: pos.top, width: MENU_W }}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              {children(close)}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default ActionMenu;
