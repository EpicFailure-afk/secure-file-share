import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaKey, FaArrowLeft } from "react-icons/fa";
import { Button, Card, CardBody, IconButton, Input, Badge } from "../components/atoms";
import { FormField, useToast } from "../components/molecules";
import { requestPasswordReset, verifyPasswordReset } from "../api";
import styles from "./auth.module.css";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await requestPasswordReset({ email });
      if (!res || res.error) {
        setError(res?.error || "Failed to send reset token. Please try again.");
        return;
      }
      if (res.success) {
        setStep(2);
        setSuccess("Verification code sent to your email.");
        toast.info({ title: "Code sent", description: `Check ${email} for the 8-character code.` });
      } else {
        setError("Failed to send verification token. Please try again.");
      }
    } catch (err) {
      console.error("Reset Request Error:", err);
      setError("Network error. Please check your connection.");
    } finally { setLoading(false); }
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); setLoading(false); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters long"); setLoading(false); return; }
    try {
      const res = await verifyPasswordReset({ email, token, newPassword });
      if (!res || res.error) { setError(res?.error || "Failed to reset password. Please try again."); return; }
      if (res.success) {
        setSuccess("Password reset successful! Redirecting to login…");
        toast.success({ title: "Password updated", description: "Sign in with your new password." });
        setEmail(""); setToken(""); setNewPassword(""); setConfirmPassword("");
        setTimeout(() => navigate("/login"), 1800);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } catch (err) {
      console.error("Reset Verification Error:", err);
      setError("Network error. Please check your connection.");
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      >
        <Card variant="glass" elevation={4} padding="lg">
          <CardBody style={{ padding: 0 }}>
            <div className={styles.stepBadge}>
              <Badge variant="brand" size="sm" dot>Step {step} of 2</Badge>
            </div>

            <header className={styles.header}>
              <h1 className={styles.title}>Reset password</h1>
              <p className={styles.subtitle}>
                {step === 1
                  ? "Enter your email and we'll send a verification code."
                  : "Enter the code and choose a new password."}
              </p>
            </header>

            {step === 1 ? (
              <form className={styles.form} onSubmit={handleRequestReset}>
                <FormField label="Registered email" required>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<FaEnvelope />}
                    autoComplete="email"
                    required
                  />
                </FormField>

                {error && <p className={styles.errorBox}>{error}</p>}
                {success && <p className={styles.successBox}>{success}</p>}

                <Button type="submit" variant="primary" size="lg" full loading={loading}>
                  Send verification code
                </Button>

                <p className={styles.footLink}>
                  Remember it now? <Link to="/login">Back to login</Link>
                </p>
              </form>
            ) : (
              <form className={styles.form} onSubmit={handleVerifyReset}>
                <p className={styles.infoBox}>
                  <FaKey />
                  <span>We sent an 8-character code to <strong>{email}</strong>.</span>
                </p>

                <FormField label="Verification code" required>
                  <Input
                    type="text"
                    placeholder="Aa1#xY2!"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    leftIcon={<FaKey />}
                    maxLength={8}
                    required
                    style={{
                      letterSpacing: "0.5em",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-lg)",
                      textAlign: "center",
                    }}
                  />
                </FormField>

                <FormField label="New password" required hint="At least 8 characters.">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    leftIcon={<FaLock />}
                    autoComplete="new-password"
                    required
                    rightSlot={
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ pointerEvents: "auto" }}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </IconButton>
                    }
                  />
                </FormField>

                <FormField label="Confirm new password" required>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<FaLock />}
                    autoComplete="new-password"
                    required
                  />
                </FormField>

                {error && <p className={styles.errorBox}>{error}</p>}
                {success && <p className={styles.successBox}>{success}</p>}

                <Button type="submit" variant="primary" size="lg" full loading={loading}>
                  Reset password
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  full
                  leftIcon={<FaArrowLeft />}
                  onClick={() => { setStep(1); setError(""); setSuccess(""); }}
                >
                  Back
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
