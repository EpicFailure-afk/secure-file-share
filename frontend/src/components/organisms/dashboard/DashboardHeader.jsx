import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUserEdit, FaFolderPlus } from "react-icons/fa";
import { Button, Badge } from "../../atoms";
import UploadMenu from "./UploadMenu";
import styles from "./DashboardHeader.module.css";

const ROLE_LABEL = {
  staff: "Staff", manager: "Manager", admin: "Admin",
  owner: "Owner", superadmin: "Super Admin",
};

const memberSince = (date) =>
  date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : null;

const DashboardHeader = ({ user, onUpload, uploading, onNewFolder }) => (
  <motion.header
    className={styles.header}
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
  >
    <div className={styles.left}>
      {user && (
        <div className={styles.greeting}>
          <p className={styles.welcome}>
            Welcome back, <span className={styles.username}>{user.username}</span>
            {user.organization && user.role && (
              <Badge variant="brand" size="sm" className={styles.roleBadge}>
                {ROLE_LABEL[user.role] || user.role}
              </Badge>
            )}
          </p>
          <div className={styles.metaRow}>
            <Link to="/edit-profile" className={styles.editLink}>
              <FaUserEdit /> Edit your profile
            </Link>
            {user.createdAt && (
              <span className={styles.memberSince}>Member since {memberSince(user.createdAt)}</span>
            )}
          </div>
        </div>
      )}
      <h1 className={styles.title}>My files</h1>
    </div>

    <div className={styles.actions}>
      <Button variant="outline" size="lg" leftIcon={<FaFolderPlus />} onClick={onNewFolder}>
        New Folder
      </Button>
      <UploadMenu onUpload={onUpload} uploading={uploading} size="lg" />
    </div>
  </motion.header>
);

export default DashboardHeader;
