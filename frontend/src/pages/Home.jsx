import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FaShieldAlt, FaClock, FaBolt, FaLock, FaUsers, FaCheckCircle,
  FaArrowRight, FaUser, FaUpload, FaShareAlt, FaDownload,
} from "react-icons/fa";
import { Button, Card, CardBody, Badge } from "../components/atoms";
import { useAuth } from "../auth/useAuth";
import styles from "./Home.module.css";

const features = [
  {
    icon: <FaShieldAlt />,
    title: "End-to-End Encryption",
    body: "AES-256 protects every file at rest and in transit. Only the people you choose can decrypt.",
    accent: "brand",
  },
  {
    icon: <FaClock />,
    title: "Expiring Links",
    body: "Set hours, days, or one-time downloads. Shares self-destruct on schedule.",
    accent: "info",
  },
  {
    icon: <FaBolt />,
    title: "Fast Transfers",
    body: "Resumable, chunked uploads with on-the-fly virus scanning. No bandwidth caps.",
    accent: "warning",
  },
  {
    icon: <FaLock />,
    title: "Password-Locked Files",
    body: "Layer an extra password on any file. Recipients prove ownership before download.",
    accent: "brand",
  },
  {
    icon: <FaUsers />,
    title: "Organizations & Roles",
    body: "Five role levels, invite codes, and audit logs let you run a real team — not a free-for-all.",
    accent: "info",
  },
  {
    icon: <FaCheckCircle />,
    title: "Integrity Verification",
    body: "SHA-256 fingerprints prove every download is byte-identical to the source.",
    accent: "success",
  },
];

const steps = [
  { icon: <FaUpload />,    label: "Upload",  copy: "Drop a file. We encrypt it before storage." },
  { icon: <FaShareAlt />,  label: "Share",   copy: "Generate a link with an expiry or a password." },
  { icon: <FaDownload />,  label: "Download", copy: "Recipients verify, fetch, and we wipe on schedule." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0, 0, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const Home = () => {
  const { isAuthed } = useAuth();

  return (
    <div className={styles.page}>
      {/* ---------------- Hero ---------------- */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroInner}
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <Badge variant="brand" size="sm" dot>End-to-end encrypted</Badge>
          </motion.div>

          <motion.h1 className={styles.heroTitle} variants={fadeUp}>
            Share files like
            <span className={styles.titleAccent}> they&apos;re yours alone</span>
          </motion.h1>

          <motion.p className={styles.heroSubtitle} variants={fadeUp}>
            SecureShare puts AES-256, expiring links, virus scanning, and integrity proofs
            behind one disarmingly simple workflow. No more emailing zip files and praying.
          </motion.p>

          <motion.div className={styles.ctaRow} variants={fadeUp}>
            {isAuthed ? (
              <Button as={Link} variant="primary" size="lg" leftIcon={<FaUser />} onClick={() => (window.location.href = "/dashboard")}>
                Back to Dashboard
              </Button>
            ) : (
              <>
                <Link to="/register" style={{ textDecoration: "none" }}>
                  <Button variant="primary" size="lg" rightIcon={<FaArrowRight />}>Get started — it&apos;s free</Button>
                </Link>
                <Link to="/login" style={{ textDecoration: "none" }}>
                  <Button variant="secondary" size="lg">I already have an account</Button>
                </Link>
              </>
            )}
          </motion.div>

          <motion.ul className={styles.heroTrust} variants={fadeUp}>
            <li><FaCheckCircle /> No credit card required</li>
            <li><FaCheckCircle /> 5 GB free storage</li>
            <li><FaCheckCircle /> Self-hostable</li>
          </motion.ul>
        </motion.div>

        {/* Floating preview card */}
        <motion.div
          className={styles.heroPreview}
          initial={{ opacity: 0, y: 30, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.2, 0, 0, 1] }}
          aria-hidden="true"
        >
          <Card variant="glass" elevation={4} padding="md">
            <div className={styles.previewHeader}>
              <span className={styles.previewDot} style={{ background: "var(--danger)" }} />
              <span className={styles.previewDot} style={{ background: "var(--warning)" }} />
              <span className={styles.previewDot} style={{ background: "var(--success)" }} />
              <span className={styles.previewTitle}>SecureShare · /dashboard</span>
            </div>
            <div className={styles.previewRow}>
              <div className={styles.previewIcon}><FaShieldAlt /></div>
              <div className={styles.previewMeta}>
                <strong>q4-financials.pdf</strong>
                <span>2.4 MB · Shared with 3 · expires in 6h 12m</span>
              </div>
              <Badge variant="success" dot>Active</Badge>
            </div>
            <div className={styles.previewRow}>
              <div className={styles.previewIcon}><FaLock /></div>
              <div className={styles.previewMeta}>
                <strong>backups.zip</strong>
                <span>841 MB · Password-locked</span>
              </div>
              <Badge variant="warning" dot>Locked</Badge>
            </div>
            <div className={styles.previewRow}>
              <div className={styles.previewIcon}><FaUsers /></div>
              <div className={styles.previewMeta}>
                <strong>design-system.fig</strong>
                <span>12 MB · Org-wide · 18 downloads</span>
              </div>
              <Badge variant="brand" dot>Org</Badge>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className={styles.featuresWrap}>
        <motion.header
          className={styles.sectionHeader}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="neutral" size="sm">Why teams switch</Badge>
          <h2 className={styles.sectionTitle}>Designed for files you don&apos;t want leaked</h2>
          <p className={styles.sectionLead}>
            Six things every other file-sharing tool skips. We made them the default.
          </p>
        </motion.header>

        <motion.div
          className={styles.featureGrid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={stagger}
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}>
              <Card variant="glass" elevation={2} interactive className={styles.featureCard}>
                <CardBody>
                  <div className={`${styles.featureIcon} ${styles[`accent_${f.accent}`]}`}>{f.icon}</div>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureBody}>{f.body}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className={styles.howWrap}>
        <motion.header
          className={styles.sectionHeader}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="brand" size="sm">How it works</Badge>
          <h2 className={styles.sectionTitle}>Three steps. Zero learning curve.</h2>
        </motion.header>

        <motion.ol
          className={styles.stepsGrid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={stagger}
        >
          {steps.map((s, i) => (
            <motion.li key={s.label} variants={fadeUp} className={styles.stepItem}>
              <span className={styles.stepIndex}>0{i + 1}</span>
              <div className={styles.stepIcon}>{s.icon}</div>
              <h4 className={styles.stepTitle}>{s.label}</h4>
              <p className={styles.stepCopy}>{s.copy}</p>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* ---------------- Bottom CTA ---------------- */}
      <section className={styles.bottomCta}>
        <Card variant="brand" elevation={3} padding="lg" className={styles.bottomCard}>
          <CardBody>
            <h2 className={styles.bottomTitle}>Ready when you are.</h2>
            <p className={styles.bottomLead}>
              Free forever for solo use. Org plans starting at zero dollars while we&apos;re in beta.
            </p>
            {isAuthed ? (
              <Link to="/dashboard" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="lg" rightIcon={<FaArrowRight />}>Open your dashboard</Button>
              </Link>
            ) : (
              <Link to="/register" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="lg" rightIcon={<FaArrowRight />}>Create your account</Button>
              </Link>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
};

export default Home;
