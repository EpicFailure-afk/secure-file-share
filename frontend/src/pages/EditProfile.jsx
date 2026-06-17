import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaSave, FaEnvelope, FaUserCog, FaSignOutAlt } from "react-icons/fa";
import { Button, Card, CardBody, IconButton, Input, Divider } from "../components/atoms";
import { FormField, useToast } from "../components/molecules";
import { PageHeader, TabBar, TableSkeleton } from "../components/organisms/shared";
import { getUserProfile, updateUserProfile, updateUserPassword, logoutAllDevices } from "../api";
import styles from "./EditProfile.module.css";

const TABS = [
  { id: "profile",  label: "Profile information", icon: <FaUser /> },
  { id: "password", label: "Change password",     icon: <FaLock /> },
];

const EditProfile = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [username, setUsername] = useState("");
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError] = useState("");
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      await logoutAllDevices();
      toast.success({ title: "Signed out everywhere", description: "All other sessions were ended." });
      navigate("/login");
    } catch (err) {
      console.error("Logout-all Error:", err);
      toast.error({ title: "Couldn't sign out everywhere", description: "Please try again." });
    } finally {
      setLoggingOutAll(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await getUserProfile();
        if (res.error) {
          if (res.error === "Unauthorized") { localStorage.removeItem("token"); navigate("/login"); return; }
          toast.error({ title: "Couldn't load profile", description: res.error });
        } else {
          setUser(res.user);
          setUsername(res.user.username || "");
        }
      } catch (err) {
        console.error("Fetch User Error:", err);
        toast.error({ title: "Couldn't load profile", description: "Please try again." });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, toast]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateUserProfile({ username });
      if (res.error) toast.error({ title: "Update failed", description: res.error });
      else { setUser((u) => ({ ...u, username })); toast.success({ title: "Profile updated" }); }
    } catch (err) {
      console.error("Update Profile Error:", err);
      toast.error({ title: "Update failed", description: "Please try again." });
    } finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pw.newPassword !== pw.confirmPassword) { setPwError("New passwords do not match."); return; }
    if (pw.newPassword.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      const res = await updateUserPassword(pw);
      if (res.error) toast.error({ title: "Couldn't update password", description: res.error });
      else {
        setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
        toast.success({ title: "Password updated", description: "Use it next time you sign in." });
      }
    } catch (err) {
      console.error("Update Password Error:", err);
      toast.error({ title: "Couldn't update password", description: "Please try again." });
    } finally { setSaving(false); }
  };

  const pwToggle = (key, label) => (
    <IconButton
      size="sm"
      variant="ghost"
      aria-label={show[key] ? `Hide ${label}` : `Show ${label}`}
      onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
      style={{ pointerEvents: "auto" }}
    >
      {show[key] ? <FaEyeSlash /> : <FaEye />}
    </IconButton>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<FaUserCog />}
        title="Edit your profile"
        subtitle="Update your account details and password"
        actions={<Button variant="ghost" leftIcon={<FaArrowLeft />} onClick={() => navigate("/dashboard")}>Back to dashboard</Button>}
      />

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className={styles.content}>
        {loading && !user ? (
          <TableSkeleton rows={3} cols={1} />
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <Card variant="surface" elevation={1} padding="lg" className={styles.card}>
              <CardBody style={{ padding: 0 }}>
                {activeTab === "profile" ? (
                  <form className={styles.form} onSubmit={saveProfile}>
                    <FormField label="Username" required>
                      <Input name="username" value={username} onChange={(e) => setUsername(e.target.value)} leftIcon={<FaUser />} required />
                    </FormField>

                    <FormField label="Email" hint="Email cannot be changed.">
                      <Input type="email" value={user?.email || ""} leftIcon={<FaEnvelope />} disabled />
                    </FormField>

                    <div className={styles.actions}>
                      <Button type="submit" variant="primary" leftIcon={<FaSave />} loading={saving}>Save changes</Button>
                    </div>
                  </form>
                ) : (
                  <form className={styles.form} onSubmit={savePassword}>
                    <FormField label="Current password" required>
                      <Input
                        type={show.current ? "text" : "password"}
                        value={pw.currentPassword}
                        onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                        leftIcon={<FaLock />}
                        autoComplete="current-password"
                        required
                        rightSlot={pwToggle("current", "current password")}
                      />
                    </FormField>

                    <FormField label="New password" required hint="At least 8 characters.">
                      <Input
                        type={show.next ? "text" : "password"}
                        value={pw.newPassword}
                        onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                        leftIcon={<FaLock />}
                        autoComplete="new-password"
                        required
                        rightSlot={pwToggle("next", "new password")}
                      />
                    </FormField>

                    <FormField label="Confirm new password" required error={pwError || undefined}>
                      <Input
                        type={show.confirm ? "text" : "password"}
                        value={pw.confirmPassword}
                        onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
                        leftIcon={<FaLock />}
                        autoComplete="new-password"
                        required
                        rightSlot={pwToggle("confirm", "confirmation")}
                      />
                    </FormField>

                    <div className={styles.actions}>
                      <Button type="submit" variant="primary" leftIcon={<FaSave />} loading={saving}>Update password</Button>
                    </div>
                  </form>
                )}

                {activeTab === "password" && (
                  <>
                    <Divider />
                    <div className={styles.form}>
                      <FormField
                        label="Sign out everywhere"
                        hint="Ends every active session on all devices and revokes their access. Use this if you suspect your account was compromised."
                      >
                        <Button
                          type="button"
                          variant="danger"
                          leftIcon={<FaSignOutAlt />}
                          loading={loggingOutAll}
                          onClick={handleLogoutAll}
                        >
                          Log out of all devices
                        </Button>
                      </FormField>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EditProfile;
