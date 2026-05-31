import styles from "./MeshBackdrop.module.css";

/* Aurora-mesh gradient backdrop. Replaces the dead Unsplash background.
   Used on Home + auth pages in later PRs; mounted globally in PR1 so the
   visual lift starts immediately. Pure CSS — no JS work per frame. */
const MeshBackdrop = ({ variant = "ambient" }) => (
  <div aria-hidden="true" className={`${styles.backdrop} ${styles[variant]}`}>
    <span className={`${styles.blob} ${styles.blobA}`} />
    <span className={`${styles.blob} ${styles.blobB}`} />
    <span className={`${styles.blob} ${styles.blobC}`} />
    <span className={styles.noise} />
  </div>
);

export default MeshBackdrop;
