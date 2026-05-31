import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaKey, FaArrowLeft } from "react-icons/fa";
import { Button, Card, CardBody, IconButton, Input, Divider, Badge } from "../components/atoms";
import { FormField, useToast } from "../components/molecules";
import { requestLoginToken, verifyLoginToken } from "../api";
import { useAuth } from "../auth/useAuth";
import styles from "./auth.module.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await requestLoginToken({ email, password });
      if (!res || res.error) {
        setError(res?.error || "Login failed. Please check your credentials.");
        return;
      }
      if (res.success) {
        setStep(2);
        toast.info({ title: "Code sent", description: "Check your inbox for the 6-character code." });
      } else {
        setError("Failed to send verification token. Please try again.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await verifyLoginToken({ email, token });
      if (!res || res.error) {
        setError(res?.error || "Verification failed. Please check your token.");
        return;
      }
      if (res.token) {
        localStorage.setItem("token", res.token);
        toast.success({ title: "Welcome back", description: "Loading your dashboard…" });
        await refresh();
        navigate("/dashboard");
      } else {
        setError("Invalid response from server.");
      }
    } catch (err) {
      console.error("Verification Error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
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
              <h1 className={styles.title}>Welcome back</h1>
              <p className={styles.subtitle}>
                {step === 1
                  ? "Sign in to continue to your secure dashboard."
                  : "Enter the 6-character verification code we just emailed you."}
              </p>
            </header>

            {step === 1 ? (
              <form className={styles.form} onSubmit={handleRequestToken}>
                <FormField label="Email" required>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<FaEnvelope />}
                    required
                    autoComplete="email"
                  />
                </FormField>

                <FormField label="Password" required>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<FaLock />}
                    autoComplete="current-password"
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

                <div className={styles.row}>
                  <span />
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>

                {error && <p className={styles.errorBox}>{error}</p>}

                <Button type="submit" variant="primary" size="lg" full loading={loading}>
                  Continue
                </Button>

                <Divider label="new here?" />

                <p className={styles.footLink}>
                  Don&apos;t have an account? <Link to="/register">Create one</Link>
                </p>
              </form>
            ) : (
              <form className={styles.form} onSubmit={handleVerifyToken}>
                <p className={styles.infoBox}>
                  <FaKey />
                  <span>We sent a 6-character code to <strong>{email}</strong>. It expires in 5 minutes.</span>
                </p>

                <FormField label="Verification code" required>
                  <Input
                    type="text"
                    placeholder="ABC123"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}  //! fixed
                    leftIcon={<FaKey />}
                    maxLength={6}
                    autoComplete="one-time-code"
                    required
                    style={{
                      letterSpacing: "0.5em",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-lg)",
                      textAlign: "center",
                    }}
                  />
                </FormField>

                {error && <p className={styles.errorBox}>{error}</p>}

                <Button type="submit" variant="primary" size="lg" full loading={loading}>
                  Verify & Sign in
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  full
                  leftIcon={<FaArrowLeft />}
                  onClick={() => { setStep(1); setError(""); }}
                >
                  Back to login
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
