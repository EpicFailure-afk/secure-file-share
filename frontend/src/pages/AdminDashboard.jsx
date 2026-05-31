import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUsers, FaFile, FaShieldAlt, FaVirus, FaDatabase, FaCheckCircle,
  FaBan, FaSync, FaTrash, FaCog, FaHistory, FaSearch, FaUserShield,
  FaUserSlash, FaChartBar,
} from "react-icons/fa";
import { Button, IconButton, Input, Badge, Card, CardBody } from "../components/atoms";
import { useToast } from "../components/molecules";
import {
  PageHeader, TabBar, StatCard, StatGrid, DataTable, Pagination, Toolbar, TableSkeleton,
} from "../components/organisms/shared";
import { ScanBadge, FileStatusBadge } from "../components/organisms/shared/badges";
import {
  getAdminDashboard, getAdminUsers, getAdminFiles, deactivateUser, activateUser,
  updateUserRole, deleteUser, adminRevokeFile, adminRestoreFile, adminDeleteFile,
  scanFile, verifyFileIntegrity, quarantineFile, runIntegrityCheck, scanPendingFiles,
  cleanupExpiredFiles, getAuditLogs, getUserProfile,
} from "../api";
import styles from "./AdminDashboard.module.css";

const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
const formatDate = (d) => new Date(d).toLocaleString();

const TABS = [
  { id: "overview", label: "Overview", icon: <FaChartBar /> },
  { id: "users",    label: "Users",    icon: <FaUsers /> },
  { id: "files",    label: "Files",    icon: <FaFile /> },
  { id: "logs",     label: "Audit logs", icon: <FaHistory /> },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileFilter, setFileFilter] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [actionLoading, setActionLoading] = useState(null);

  /* --------------------------------- fetch --------------------------------- */
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const res = await getAdminDashboard();
    if (res.error) toast.error({ title: "Couldn't load dashboard", description: res.error });
    else { setStats(res.stats); setRecentActivity(res.recentActivity || []); }
    setLoading(false);
  }, [toast]);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    const res = await getAdminUsers(page, 20, searchQuery);
    if (res.error) toast.error({ title: "Couldn't load users", description: res.error });
    else { setUsers(res.users || []); setPagination(res.pagination || { page: 1, pages: 1 }); }
    setLoading(false);
  }, [searchQuery, toast]);

  const fetchFiles = useCallback(async (page = 1) => {
    setLoading(true);
    const res = await getAdminFiles(page, 20, { ...fileFilter, search: searchQuery });
    if (res.error) toast.error({ title: "Couldn't load files", description: res.error });
    else { setFiles(res.files || []); setPagination(res.pagination || { page: 1, pages: 1 }); }
    setLoading(false);
  }, [fileFilter, searchQuery, toast]);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    const res = await getAuditLogs(page, 50);
    if (res.error) toast.error({ title: "Couldn't load logs", description: res.error });
    else { setAuditLogs(res.logs || []); setPagination(res.pagination || { page: 1, pages: 1 }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    (async () => {
      const profile = await getUserProfile();
      if (profile.error || profile.user?.role !== "admin") { navigate("/dashboard"); return; }
      fetchDashboard();
    })();
  }, [navigate, fetchDashboard]);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    else if (activeTab === "files") fetchFiles();
    else if (activeTab === "logs") fetchLogs();
    else if (activeTab === "overview") fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* -------------------------------- actions -------------------------------- */
  const runAction = async (id, fn, okMsg, after) => {
    setActionLoading(id);
    try {
      const res = await fn();
      if (!res) return;
      if (res.error) toast.error({ title: "Action failed", description: res.error });
      else { toast.success({ title: okMsg, description: res.message }); after?.(); }
    } catch (err) {
      console.error("Action failed:", err);
      toast.error({ title: "Action failed", description: "Please try again." });
    } finally { setActionLoading(null); }
  };

  const userAction = (userId, action) => {
    const map = {
      deactivate: () => deactivateUser(userId),
      activate:   () => activateUser(userId),
      makeAdmin:  () => updateUserRole(userId, "admin"),
      removeAdmin:() => updateUserRole(userId, "user"),
      delete:     () => window.confirm("Delete this user and all their files?") ? deleteUser(userId) : null,
    };
    runAction(userId, map[action], "Done", fetchUsers);
  };

  const fileAction = (fileId, action) => {
    const map = {
      revoke:     () => adminRevokeFile(fileId, "Revoked by admin"),
      restore:    () => adminRestoreFile(fileId),
      delete:     () => window.confirm("Delete this file?") ? adminDeleteFile(fileId) : null,
      scan:       () => scanFile(fileId),
      verify:     () => verifyFileIntegrity(fileId),
      quarantine: () => quarantineFile(fileId),
    };
    runAction(fileId, map[action], "Done", fetchFiles);
  };

  const systemAction = (action) => {
    const map = {
      integrityCheck: runIntegrityCheck,
      scanPending:    scanPendingFiles,
      cleanup:        cleanupExpiredFiles,
    };
    runAction(action, map[action], "System task complete", fetchDashboard);
  };

  const search = () => {
    if (activeTab === "users") fetchUsers();
    else if (activeTab === "files") fetchFiles();
  };

  /* --------------------------------- columns -------------------------------- */
  const userColumns = [
    { key: "username", header: "Username", render: (u) => <strong style={{ color: "var(--fg-primary)" }}>{u.username}</strong> },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (u) => <Badge variant={u.role === "admin" ? "danger" : "neutral"} size="sm">{u.role}</Badge> },
    { key: "status", header: "Status", render: (u) => <Badge variant={u.isActive ? "success" : "neutral"} size="sm" dot>{u.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "fileCount", header: "Files", align: "right" },
    { key: "storageUsed", header: "Storage", align: "right", render: (u) => formatBytes(u.storageUsed) },
    {
      key: "actions", header: "Actions", align: "right",
      render: (u) => (
        <div className={styles.rowActions}>
          {u.isActive
            ? <IconButton aria-label="Deactivate" variant="ghost" size="sm" disabled={actionLoading === u._id} onClick={() => userAction(u._id, "deactivate")}><FaUserSlash /></IconButton>
            : <IconButton aria-label="Activate" variant="ghost" size="sm" disabled={actionLoading === u._id} onClick={() => userAction(u._id, "activate")}><FaCheckCircle /></IconButton>}
          {u.role !== "admin"
            ? <IconButton aria-label="Make admin" variant="ghost" size="sm" disabled={actionLoading === u._id} onClick={() => userAction(u._id, "makeAdmin")}><FaUserShield /></IconButton>
            : <IconButton aria-label="Remove admin" variant="ghost" size="sm" disabled={actionLoading === u._id} onClick={() => userAction(u._id, "removeAdmin")}><FaUsers /></IconButton>}
          <IconButton aria-label="Delete" variant="danger" size="sm" disabled={actionLoading === u._id} onClick={() => userAction(u._id, "delete")}><FaTrash /></IconButton>
        </div>
      ),
    },
  ];

  const fileColumns = [
    { key: "fileName", header: "File name", render: (f) => <strong style={{ color: "var(--fg-primary)" }}>{f.fileName}</strong> },
    { key: "owner", header: "Owner", render: (f) => f.userId?.username || "Unknown" },
    { key: "fileSize", header: "Size", align: "right", render: (f) => formatBytes(f.fileSize) },
    { key: "uploadDate", header: "Uploaded", render: (f) => formatDate(f.uploadDate) },
    { key: "scanStatus", header: "Scan", render: (f) => <ScanBadge status={f.scanStatus} /> },
    { key: "status", header: "Status", render: (f) => <FileStatusBadge file={f} /> },
    {
      key: "actions", header: "Actions", align: "right",
      render: (f) => (
        <div className={styles.rowActions}>
          <IconButton aria-label="Scan" variant="ghost" size="sm" disabled={actionLoading === f._id} onClick={() => fileAction(f._id, "scan")}><FaVirus /></IconButton>
          <IconButton aria-label="Verify integrity" variant="ghost" size="sm" disabled={actionLoading === f._id} onClick={() => fileAction(f._id, "verify")}><FaShieldAlt /></IconButton>
          {f.isRevoked
            ? <IconButton aria-label="Restore" variant="ghost" size="sm" disabled={actionLoading === f._id} onClick={() => fileAction(f._id, "restore")}><FaSync /></IconButton>
            : <IconButton aria-label="Revoke" variant="ghost" size="sm" disabled={actionLoading === f._id} onClick={() => fileAction(f._id, "revoke")}><FaBan /></IconButton>}
          <IconButton aria-label="Delete" variant="danger" size="sm" disabled={actionLoading === f._id} onClick={() => fileAction(f._id, "delete")}><FaTrash /></IconButton>
        </div>
      ),
    },
  ];

  const logColumns = [
    { key: "timestamp", header: "Timestamp", render: (l) => formatDate(l.timestamp) },
    { key: "user", header: "User", render: (l) => l.userId?.username || "System" },
    { key: "action", header: "Action", render: (l) => <Badge variant="neutral" size="sm">{l.action}</Badge> },
    { key: "targetType", header: "Target" },
    { key: "status", header: "Status", render: (l) => <Badge variant={l.status === "success" ? "success" : "danger"} size="sm">{l.status}</Badge> },
    { key: "details", header: "Details", render: (l) => <span className={styles.muted}>{JSON.stringify(l.details).slice(0, 48)}…</span> },
  ];

  /* --------------------------------- render --------------------------------- */
  return (
    <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHeader icon={<FaUserShield />} title="Admin Dashboard" subtitle="Manage users, files, and platform health" />

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className={styles.content}>
        {activeTab === "overview" && (
          loading && !stats ? <TableSkeleton rows={2} cols={4} /> : stats && (
            <div className={styles.overview}>
              <StatGrid>
                <StatCard tone="info"    icon={<FaUsers />}    label="Users"    value={stats.users.total}    detail={`${stats.users.active} active · ${stats.users.inactive} inactive`} />
                <StatCard tone="success" icon={<FaFile />}     label="Files"    value={stats.files.total}    detail={`${stats.files.revoked} revoked`} />
                <StatCard tone="danger"  icon={<FaVirus />}    label="Security" value={stats.files.infected} detail={`infected · ${stats.files.pendingScan} pending scan`} />
                <StatCard tone="warning" icon={<FaDatabase />} label="Storage"  value={formatBytes(stats.storage.totalUsed)} detail="total used" />
              </StatGrid>

              <div className={styles.lowerGrid}>
                <Card variant="surface" elevation={1} padding="md">
                  <CardBody style={{ padding: 0 }}>
                    <h3 className={styles.cardTitle}><FaCog /> System actions</h3>
                    <div className={styles.systemActions}>
                      <Button variant="secondary" leftIcon={<FaShieldAlt />} loading={actionLoading === "integrityCheck"} onClick={() => systemAction("integrityCheck")}>Integrity check</Button>
                      <Button variant="secondary" leftIcon={<FaVirus />} loading={actionLoading === "scanPending"} onClick={() => systemAction("scanPending")}>Scan pending</Button>
                      <Button variant="secondary" leftIcon={<FaTrash />} loading={actionLoading === "cleanup"} onClick={() => systemAction("cleanup")}>Cleanup expired</Button>
                    </div>
                    <div className={styles.clamav}>
                      <Badge variant={stats.system?.clamAvAvailable ? "success" : "danger"} size="sm" dot>
                        {stats.system?.clamAvAvailable ? "ClamAV available" : "ClamAV unavailable"}
                      </Badge>
                    </div>
                  </CardBody>
                </Card>

                <Card variant="surface" elevation={1} padding="md">
                  <CardBody style={{ padding: 0 }}>
                    <h3 className={styles.cardTitle}><FaHistory /> Recent activity</h3>
                    <ul className={styles.activityList}>
                      {recentActivity.length === 0 && <li className={styles.muted}>No recent activity.</li>}
                      {recentActivity.map((a, i) => (
                        <li key={i} className={styles.activityRow}>
                          <Badge variant="neutral" size="sm">{a.action}</Badge>
                          <span className={styles.activityUser}>{a.userId?.username || "System"}</span>
                          <span className={styles.activityTime}>{formatDate(a.timestamp)}</span>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              </div>
            </div>
          )
        )}

        {activeTab === "users" && (
          <>
            <Toolbar>
              <span className="grow">
                <Input
                  placeholder="Search users…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  leftIcon={<FaSearch />}
                />
              </span>
              <Button variant="secondary" onClick={search}>Search</Button>
            </Toolbar>
            {loading ? <TableSkeleton rows={6} cols={7} /> : (
              <>
                <DataTable columns={userColumns} rows={users} rowKey={(u) => u._id} />
                <Pagination page={pagination.page} pages={pagination.pages} onChange={fetchUsers} />
              </>
            )}
          </>
        )}

        {activeTab === "files" && (
          <>
            <Toolbar>
              <span className="grow">
                <Input
                  placeholder="Search files…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  leftIcon={<FaSearch />}
                />
              </span>
              <select className={styles.select} value={fileFilter.scanStatus || ""} onChange={(e) => setFileFilter({ ...fileFilter, scanStatus: e.target.value || undefined })}>
                <option value="">All scan status</option>
                <option value="clean">Clean</option>
                <option value="infected">Infected</option>
                <option value="pending">Pending</option>
              </select>
              <select className={styles.select} value={fileFilter.isRevoked || ""} onChange={(e) => setFileFilter({ ...fileFilter, isRevoked: e.target.value || undefined })}>
                <option value="">All files</option>
                <option value="true">Revoked</option>
                <option value="false">Active</option>
              </select>
              <Button variant="secondary" onClick={search}>Search</Button>
            </Toolbar>
            {loading ? <TableSkeleton rows={6} cols={7} /> : (
              <>
                <DataTable columns={fileColumns} rows={files} rowKey={(f) => f._id} />
                <Pagination page={pagination.page} pages={pagination.pages} onChange={fetchFiles} />
              </>
            )}
          </>
        )}

        {activeTab === "logs" && (
          loading ? <TableSkeleton rows={8} cols={6} /> : (
            <>
              <DataTable columns={logColumns} rows={auditLogs} rowKey={(l) => l._id} />
              <Pagination page={pagination.page} pages={pagination.pages} onChange={fetchLogs} />
            </>
          )
        )}
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
