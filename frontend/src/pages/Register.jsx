import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaBuilding, FaUserTie,
  FaBriefcase, FaKey, FaInfoCircle, FaPlus, FaUsers, FaCrown,
} from "react-icons/fa";
import { Button, Card, CardBody, IconButton, Input, Divider, Badge } from "../components/atoms";
import { FormField, Modal, useToast } from "../components/molecules";
import { registerUser } from "../api";
import styles from "./auth.module.css";

const ROLES = [
  { value: "staff", label: "Staff", description: "Regular employee with basic file access." },
  { value: "admin", label: "Admin", description: "Administrator with user management." },
];

const Register = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [userData, setUserData] = useState({
    username: "", email: "", password: "", confirmPassword: "",
    role: "staff", inviteCode: "", jobTitle: "", department: "", organizationName: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [orgAction, setOrgAction] = useState("none"); // none | create | join

  const change = (e) => setUserData({ ...userData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);

    if (userData.password !== userData.confirmPassword) { setError("Passwords do not match"); setLoading(false); return; }
    if (userData.password.length < 8) { setError("Password must be at least 8 characters long"); setLoading(false); return; }
    if (orgAction === "create" && !userData.organizationName.trim()) { setError("Organization name is required"); setLoading(false); return; }
    if (orgAction === "join" && !userData.inviteCode.trim()) { setError("Invite code is required to join an organization"); setLoading(false); return; }

    try {
      const reg = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        jobTitle: userData.jobTitle,
        department: userData.department,
      };
      if (orgAction === "create") {
        reg.createOrg = true;
        reg.organizationName = userData.organizationName;
        reg.role = "manager";
      } else if (orgAction === "join") {
        reg.inviteCode = userData.inviteCode;
        reg.role = userData.role;
      } else {
        reg.role = "staff";
      }

      const res = await registerUser(reg);
      if (res.error) {
        const msg = res.error;
        if (msg.includes("User already exists") || msg.includes("email already exists")) {
          setError("An account with this email already exists.");
        } else if (msg.includes("invite code")) {
          setError("Invalid or expired invite code.");
        } else if (msg.includes("Organization name")) {
          setError("Organization name already taken.");
        } else {
          setError(msg);
        }
      } else {
        setSuccess(true);
        setSuccessMessage(res.message || "Registration successful!");
        toast.success({ title: "Account created", description: "Redirecting to login…" });
        setTimeout(() => navigate("/login"), 1800);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Network error. Please check your connection.");
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <motion.div
        className={`${styles.card} ${styles.cardWide}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      >
        <Card variant="glass" elevation={4} padding="lg">
          <CardBody style={{ padding: 0 }}>
            <header className={styles.header}>
              <h1 className={styles.title}>Create your account</h1>
              <p className={styles.subtitle}>Join the platform that treats your files like they matter.</p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit}>
              <FormField label="Username" required>
                <Input name="username" placeholder="janedoe" value={userData.username} onChange={change} leftIcon={<FaUser />} required autoComplete="username" />
              </FormField>

              <FormField label="Email" required>
                <Input type="email" name="email" placeholder="you@company.com" value={userData.email} onChange={change} leftIcon={<FaEnvelope />} required autoComplete="email" />
              </FormField>

              <FormField label="Password" required hint="At least 8 characters.">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={userData.password}
                  onChange={change}
                  leftIcon={<FaLock />}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  rightSlot={
                    <IconButton size="sm" variant="ghost" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} style={{ pointerEvents: "auto" }}>
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </IconButton>
                  }
                />
              </FormField>

              <FormField label="Confirm password" required>
                <Input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={userData.confirmPassword}
                  onChange={change}
                  leftIcon={<FaLock />}
                  autoComplete="new-password"
                  required
                  rightSlot={
                    <IconButton size="sm" variant="ghost" aria-label={showConfirm ? "Hide password" : "Show password"} onClick={() => setShowConfirm(!showConfirm)} style={{ pointerEvents: "auto" }}>
                      {showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </IconButton>
                  }
                />
              </FormField>

              <Divider label="Organization · optional" />

              <div className={styles.orgActions}>
                <button
                  type="button"
                  className={`${styles.orgActionBtn} ${orgAction === "create" ? styles.active : ""}`}
                  onClick={() => setOrgAction(orgAction === "create" ? "none" : "create")}
                >
                  <FaPlus /> Create organization
                </button>
                <button
                  type="button"
                  className={`${styles.orgActionBtn} ${orgAction === "join" ? styles.active : ""}`}
                  onClick={() => setOrgAction(orgAction === "join" ? "none" : "join")}
                >
                  <FaUsers /> Join organization
                </button>
              </div>

              <AnimatePresence initial={false}>
                {orgAction === "create" && (
                  <motion.div
                    key="create"
                    className={styles.orgPanel}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className={styles.infoBox} style={{
                      background: "color-mix(in srgb, var(--success) 14%, transparent)",
                      borderColor: "color-mix(in srgb, var(--success) 32%, transparent)",
                      color: "var(--success)",
                    }}>
                      <FaCrown />
                      <span>You&apos;ll become the <strong>Manager</strong> of this organization.</span>
                    </p>

                    <FormField label="Organization name" required>
                      <Input name="organizationName" placeholder="Acme Co." value={userData.organizationName} onChange={change} leftIcon={<FaBuilding />} required={orgAction === "create"} />
                    </FormField>

                    <FormField label="Job title (optional)">
                      <Input name="jobTitle" placeholder="Founder" value={userData.jobTitle} onChange={change} leftIcon={<FaBriefcase />} />
                    </FormField>

                    <FormField label="Department (optional)">
                      <Input name="department" placeholder="Operations" value={userData.department} onChange={change} leftIcon={<FaBuilding />} />
                    </FormField>
                  </motion.div>
                )}

                {orgAction === "join" && (
                  <motion.div
                    key="join"
                    className={styles.orgPanel}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <FormField label="Invite code" required hint="Case-sensitive — copy it exactly.">
                      <Input name="inviteCode" placeholder="ABCD-1234" value={userData.inviteCode} onChange={change} leftIcon={<FaKey />} required={orgAction === "join"} />
                    </FormField>

                    <p className={styles.infoBox}>
                      <FaInfoCircle />
                      <span>Ask your organization manager for the invite code.</span>
                    </p>

                    <div>
                      <label className={styles.fieldLabel}>Select your role</label>
                      <div className={styles.roleGrid}>
                        {ROLES.map((role) => {
                          const selected = userData.role === role.value;
                          return (
                            <label
                              key={role.value}
                              className={`${styles.roleCard} ${selected ? styles.roleCardActive : ""}`}
                            >
                              <input type="radio" name="role" value={role.value} checked={selected} onChange={change} />
                              <span className={styles.roleHeader}>
                                <FaUserTie /> {role.label}
                              </span>
                              <span className={styles.roleDesc}>{role.description}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <FormField label="Job title (optional)">
                      <Input name="jobTitle" placeholder="Software Engineer" value={userData.jobTitle} onChange={change} leftIcon={<FaBriefcase />} />
                    </FormField>

                    <FormField label="Department (optional)">
                      <Input name="department" placeholder="Engineering" value={userData.department} onChange={change} leftIcon={<FaBuilding />} />
                    </FormField>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <p className={styles.errorBox}>{error}</p>}

              <Button type="submit" variant="primary" size="lg" full loading={loading}>
                Create account
              </Button>

              <p className={styles.footLink}>
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </form>
          </CardBody>
        </Card>
      </motion.div>

      <Modal
        open={success}
        onClose={() => setSuccess(false)}
        title="Registration successful"
        description="You&apos;ll be redirected to the login page in a moment."
        showClose={false}
        footer={
          <Button variant="primary" onClick={() => navigate("/login")}>Go to login now</Button>
        }
      >
        <p style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Badge variant="success" dot size="lg">Welcome</Badge>
          <span>{successMessage}</span>
        </p>
      </Modal>
    </div>
  );
};

export default Register;
