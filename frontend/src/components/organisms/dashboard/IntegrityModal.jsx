import {
  FaCheckCircle, FaExclamationTriangle, FaShieldAlt, FaEye, FaShare,
  FaDownload, FaLock, FaUnlock,
} from "react-icons/fa";
import { Button, Badge, Spinner } from "../../atoms";
import { Modal } from "../../molecules";
import styles from "./Modals.module.css";

const formatTime = (ts) => (ts ? new Date(ts).toLocaleString() : "—");

const IntegrityModal = ({ open, onClose, loading, data }) => {
  const verified = data?.verified;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="File integrity report"
      description={data && !loading ? (verified ? "File matches its original fingerprint." : "Fingerprint mismatch detected.") : undefined}
      size="lg"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {loading && (
        <div className={styles.centerWrap}>
          <Spinner size="lg" />
          <p className={styles.muted}>Verifying file integrity…</p>
        </div>
      )}

      {!loading && data && (
        <div className={styles.integrity}>
          <div className={`${styles.statusHero} ${verified ? styles.heroOk : styles.heroBad}`}>
            <div className={styles.statusIcon}>
              {verified ? <FaCheckCircle /> : <FaExclamationTriangle />}
            </div>
            <div>
              <h3 className={styles.statusTitle}>
                {verified ? "Integrity verified" : "Integrity check failed"}
              </h3>
              <p className={styles.statusBody}>
                {verified
                  ? "This file has not been modified since upload."
                  : (data.message || "The current bytes do not match the stored SHA-256 fingerprint.")}
              </p>
            </div>
          </div>

          {data.fileInfo && (
            <div className={styles.statRow}>
              <span className={styles.stat}>
                <FaDownload /> {data.fileInfo.downloadCount ?? 0} downloads
              </span>
              <span className={styles.stat}>
                {data.fileInfo.isLocked ? <FaLock /> : <FaUnlock />}
                {" "}
                {data.fileInfo.isLocked ? "Locked" : "Unlocked"}
              </span>
            </div>
          )}

          {data.accessHistory?.length > 0 && (
            <section>
              <h4 className={styles.sectionHead}><FaEye /> Recent access</h4>
              <ul className={styles.historyList}>
                {data.accessHistory.slice(0, 5).map((a, i) => (
                  <li key={i} className={styles.historyRow}>
                    <div className={styles.historyMain}>
                      <Badge variant="neutral" size="sm">{(a.action || "").replace(/_/g, " ")}</Badge>
                      <span className={styles.historyUser}>{a.user || "—"}</span>
                    </div>
                    <div className={styles.historyMeta}>
                      {a.ipAddress && <span>IP {a.ipAddress}</span>}
                      <span>{formatTime(a.timestamp)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.sharedAccess?.length > 0 && (
            <section>
              <h4 className={styles.sectionHead}><FaShare /> Shared downloads</h4>
              <ul className={styles.historyList}>
                {data.sharedAccess.slice(0, 5).map((s, i) => (
                  <li key={i} className={styles.historyRow}>
                    <div className={styles.historyMain}>
                      <Badge variant="info" size="sm"><FaShieldAlt /> Share link</Badge>
                    </div>
                    <div className={styles.historyMeta}>
                      <span>IP {s.ipAddress}</span>
                      <span>{formatTime(s.timestamp)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
};

export default IntegrityModal;
