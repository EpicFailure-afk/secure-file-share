import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaLock, FaDownload, FaKey, FaCheckCircle, FaInfoCircle,
  FaShieldAlt, FaClock, FaUserShield, FaArrowRight,
} from "react-icons/fa";
import { Button, Card, CardBody, Badge, Spinner } from "../components/atoms";
import { FormField, EmptyState } from "../components/molecules";
import Input from "../components/atoms/Input";
import MeshBackdrop from "../components/MeshBackdrop";
import { verifyShareAccess, getSharedFileInfo, requestShareAccess } from "../api";
import logo from "../assets/image.png";
import styles from "./SharePage.module.css";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatFileType = (mimeType) => {
  if (!mimeType) return "File";
  const types = {
    "image/":                                                                       "Image",
    "application/pdf":                                                              "PDF Document",
    "application/msword":                                                           "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":      "Word Document",
    "application/vnd.ms-excel":                                                     "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":            "Excel Spreadsheet",
    "text/":                                                                        "Text",
    "video/":                                                                       "Video",
    "audio/":                                                                       "Audio",
    "application/zip":                                                              "ZIP Archive",
    "application/x-rar-compressed":                                                 "RAR Archive",
  };
  for (const [prefix, label] of Object.entries(types)) {
    if (mimeType.startsWith(prefix)) return label;
  }
  return mimeType.split("/")[1]?.toUpperCase() || "File";
};

const TRUST = [
  { icon: <FaShieldAlt />,  title: "AES-256 encryption",    body: "End-to-end encrypted in transit and at rest." },
  { icon: <FaUserShield />, title: "Owner verification",    body: "Two-step access ensures only you receive it." },
  { icon: <FaClock />,      title: "Auto-expiring",         body: "Shared files self-destruct on schedule." },
];

const SharePage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await getSharedFileInfo(token);
        if (res.error) setError(res.error);
        else setFileInfo(res.fileInfo);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError("Failed to fetch file information");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleRequestAccess = async () => {
    setSubmitting(true); setError("");
    try {
      const res = await requestShareAccess(token);
      if (res.error) setError(res.error);
      else setVerificationSent(true);
    } catch (err) {
      console.error("Request Access Error:", err);
      setError("Failed to request access. Please try again.");
    } finally { setSubmitting(false); }
  };

  const handleVerifyAccess = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      const res = await verifyShareAccess(token, verificationCode);
      if (res.error) setError(res.error);
      else setVerificationSuccess(true);
    } catch (err) {
      console.error("Verification Error:", err);
      setError("Failed to verify access code. Please try again.");
    } finally { setSubmitting(false); }
  };

  const handleDownload = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`http://localhost:5000/api/files/share/${token}/download?code=${verificationCode}`);
      if (!response.ok) throw new Error("Failed to download file");

      let filename = fileInfo.fileName;
      const cd = response.headers.get("Content-Disposition");
      if (cd) {
        const m = cd.match(/filename="(.+)"/);
        if (m && m[1]) filename = m[1];
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none"; a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) {
      console.error("Download Error:", err);
      setError("Failed to download file. Please try again.");
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <>
        <MeshBackdrop variant="ambient" />
        <div className={styles.loadingWrap}>
          <Spinner size="lg" />
          <p className={styles.loadingText}>Loading file information…</p>
        </div>
      </>
    );
  }

  if (error && !fileInfo) {
    return (
      <>
        <MeshBackdrop variant="ambient" />
        <div className={styles.errorWrap}>
          <Card variant="glass" elevation={4} padding="lg" style={{ maxWidth: 480, margin: "0 auto" }}>
            <CardBody style={{ padding: 0 }}>
              <EmptyState
                variant="error"
                icon={<FaInfoCircle />}
                title="File not available"
                description={`${error}. The link may have expired or been removed.`}
                action={<Link to="/" style={{ textDecoration: "none" }}><Button variant="primary">Go to homepage</Button></Link>}
              />
            </CardBody>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <MeshBackdrop variant="ambient" />
      <div className={styles.page}>
        <header className={styles.brand}>
          <Link to="/" className={styles.brandLink}>
            <img src={logo} alt="SecureShare" className={styles.brandLogo} />
            <span className={styles.brandText}>SecureShare</span>
          </Link>
        </header>

        <motion.div
          className={styles.cardWrap}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card variant="glass" elevation={4} padding="lg">
            <CardBody style={{ padding: 0 }}>
              <div className={styles.lockBadge}>
                <FaLock />
              </div>
              <h1 className={styles.title}>Secure file share</h1>

              {fileInfo && (
                <div className={styles.fileMeta}>
                  <p className={styles.fileName}>{fileInfo.fileName}</p>
                  <p className={styles.fileSub}>
                    {formatFileSize(fileInfo.fileSize)} · {formatFileType(fileInfo.fileType)}
                  </p>
                  <p className={styles.fileOwner}>Shared by <strong>{fileInfo.ownerName}</strong></p>
                </div>
              )}

              {!verificationSent && !verificationSuccess && (
                <div className={styles.action}>
                  <p className={styles.actionCopy}>
                    This file is protected. Request access and the owner will receive a notification.
                  </p>
                  <Button onClick={handleRequestAccess} loading={submitting} variant="primary" size="lg" full rightIcon={<FaArrowRight />}>
                    Request access
                  </Button>
                </div>
              )}

              {verificationSent && !verificationSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={styles.action}
                >
                  <p className={styles.infoBox}>
                    <FaInfoCircle />
                    <span>A code was sent to the file owner. Ask them to forward it to you.</span>
                  </p>

                  <form onSubmit={handleVerifyAccess} className={styles.form}>
                    <FormField label="Verification code" required>
                      <Input
                        placeholder="ABC123"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        leftIcon={<FaKey />}
                        maxLength={12}
                        required
                        style={{
                          letterSpacing: "0.4em",
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-lg)",
                          textAlign: "center",
                        }}
                      />
                    </FormField>

                    {error && <p className={styles.errorBox}>{error}</p>}

                    <Button type="submit" variant="primary" size="lg" full loading={submitting} rightIcon={<FaArrowRight />}>
                      Verify & access file
                    </Button>
                  </form>
                </motion.div>
              )}

              {verificationSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={styles.success}
                >
                  <div className={styles.successIcon}>
                    <FaCheckCircle />
                  </div>
                  <h3 className={styles.successTitle}>Access granted</h3>
                  <p className={styles.successCopy}>You can now download the file.</p>
                  <Button onClick={handleDownload} variant="primary" size="lg" loading={submitting} leftIcon={<FaDownload />} full>
                    Download file
                  </Button>
                </motion.div>
              )}
            </CardBody>
          </Card>

          {/* Marketing aside */}
          <Card variant="surface" elevation={1} padding="lg" className={styles.marketing}>
            <CardBody style={{ padding: 0 }}>
              <div className={styles.marketingHead}>
                <Badge variant="brand" size="sm">Why SecureShare</Badge>
                <h3 className={styles.marketingTitle}>Built for files you don&apos;t want leaked</h3>
              </div>
              <ul className={styles.trustList}>
                {TRUST.map((t) => (
                  <li key={t.title} className={styles.trustRow}>
                    <span className={styles.trustIcon}>{t.icon}</span>
                    <div>
                      <p className={styles.trustTitle}>{t.title}</p>
                      <p className={styles.trustBody}>{t.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className={styles.marketingCta}>
                <p>Need to share your own files securely?</p>
                <Link to="/register" style={{ textDecoration: "none" }}>
                  <Button variant="secondary" size="md" rightIcon={<FaArrowRight />}>Sign up free</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} SecureShare</p>
          <div className={styles.footerLinks}>
            <Link to="/contact">Contact</Link>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SharePage;
