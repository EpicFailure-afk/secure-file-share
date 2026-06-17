import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUsers, FaUserCheck, FaUserClock, FaClock, FaUpload, FaDownload, FaShare,
  FaTrash, FaEye, FaSignInAlt, FaSignOutAlt, FaCircle, FaDesktop, FaMobile,
  FaTabletAlt, FaChartLine, FaHistory, FaSync, FaUserTie, FaBroom,
} from "react-icons/fa";
import { Button, Card, CardBody, Badge } from "../components/atoms";
import { Modal, EmptyState, useToast } from "../components/molecules";
import {
  PageHeader, TabBar, StatCard, StatGrid, DataTable, Toolbar, TableSkeleton,
} from "../components/organisms/shared";
import {
  getMonitorLive, getMonitorActivity, getMonitorSessions, getMonitorWorkLogs,
  getMonitorUser, getMonitorStats, getUserProfile, cleanupSessions, resetAllSessions,
} from "../api";
import styles from "./ManagerDashboard.module.css";

const activityIcon = (type) => ({
  login: <FaSignInAlt />, logout: <FaSignOutAlt />, file_upload: <FaUpload />,
  file_download: <FaDownload />, file_share: <FaShare />, file_delete: <FaTrash />,
  file_view: <FaEye />,
}[type] || <FaCircle />);

const deviceIcon = (d) => (d === "Mobile" ? <FaMobile /> : d === "Tablet" ? <FaTabletAlt /> : <FaDesktop />);
const statusVariant = (s) => (s === "online" ? "success" : s === "idle" ? "warning" : "neutral");

const formatTime = (d) => (d ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—");
const formatDateTime = (d) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const timeSince = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const activeStatus = (la) => {
  const s = Math.floor((Date.now() - new Date(la)) / 1000);
  if (s < 60) return "Active now";
  if (s < 3600) return `Active ${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `Active ${Math.floor(s / 3600)}h ago`;
  return `Active ${Math.floor(s / 86400)}d ago`;
};

const TABS = [
  { id: "live",     label: "Live view",     icon: <FaCircle /> },
  { id: "activity", label: "Activity feed", icon: <FaHistory /> },
  { id: "sessions", label: "Sessions",      icon: <FaUsers /> },
  { id: "worklogs", label: "Work hours",    icon: <FaClock /> },
  { id: "stats",    label: "Statistics",    icon: <FaChartLine /> },
];

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live");
  const [liveData, setLiveData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [filters, setFilters] = useState({ activityType: "", activityPeriod: "today", sessionStatus: "active", period: "week" });

  const loadLive = useCallback(async () => {
    const data = await getMonitorLive();
    if (!data.error) { setLiveData(data); setLastRefresh(new Date()); }
  }, []);

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile();
      if (!profile.user) { navigate("/login"); return; }
      if (!["manager", "owner", "superadmin"].includes(profile.user.role) || !profile.user.organization) {
        navigate("/dashboard"); return;
      }
      setLoading(true);
      await loadLive();
      setLoading(false);
    })();
  }, [navigate, loadLive]);

  useEffect(() => {
    if (!autoRefresh || activeTab !== "live") return;
    const id = setInterval(loadLive, 10000);
    return () => clearInterval(id);
  }, [autoRefresh, activeTab, loadLive]);

  const loadActivities = useCallback(async () => {
    let startDate = null;
    const now = new Date();
    if (filters.activityPeriod === "today") { now.setHours(0, 0, 0, 0); startDate = now; }
    else if (filters.activityPeriod === "week") { now.setDate(now.getDate() - 7); startDate = now; }
    else if (filters.activityPeriod === "month") { now.setMonth(now.getMonth() - 1); startDate = now; }
    const params = {};
    if (filters.activityType) params.type = filters.activityType;
    if (startDate) params.startDate = startDate.toISOString();
    const data = await getMonitorActivity(1, 100, params);
    if (!data.error) setActivities(data.activities || []);
  }, [filters.activityType, filters.activityPeriod]);

  const loadSessions = useCallback(async () => {
    const params = {};
    if (filters.sessionStatus) params.status = filters.sessionStatus;
    const data = await getMonitorSessions(1, 100, params);
    if (!data.error) setSessions(data.sessions || []);
  }, [filters.sessionStatus]);

  const loadWorkLogs = useCallback(async () => {
    const data = await getMonitorWorkLogs(1, 100);
    if (!data.error) setWorkLogs(data.workLogs || []);
  }, []);

  const loadStats = useCallback(async () => {
    const data = await getMonitorStats(filters.period);
    if (!data.error) setStats(data);
  }, [filters.period]);

  useEffect(() => {
    if (activeTab === "activity") loadActivities();
    else if (activeTab === "sessions") loadSessions();
    else if (activeTab === "worklogs") loadWorkLogs();
    else if (activeTab === "stats") loadStats();
  }, [activeTab, loadActivities, loadSessions, loadWorkLogs, loadStats]);

  const openUser = async (userId) => {
    setSelectedUser(userId);
    const data = await getMonitorUser(userId, 7);
    if (!data.error) setUserDetails(data);
  };

  const cleanup = async () => {
    const res = await cleanupSessions();
    if (res.error) toast.error({ title: "Cleanup failed", description: res.error });
    else { toast.success({ title: "Sessions cleaned", description: `${res.cleanedCount} stale sessions removed.` }); loadLive(); }
  };

  const resetAll = async () => {
    if (!window.confirm("This logs out all users. Continue?")) return;
    const res = await resetAllSessions();
    if (res.error) toast.error({ title: "Reset failed", description: res.error });
    else { toast.success({ title: "Sessions reset", description: `${res.resetCount} sessions ended.` }); loadLive(); }
  };

  /* --------------------------------- columns -------------------------------- */
  const UserCell = ({ user, onClick }) => (
    <button className={styles.userCell} onClick={onClick} disabled={!onClick} type="button">
      <span>{user?.username}</span>
      <Badge variant="neutral" size="sm">{user?.role}</Badge>
    </button>
  );

  const activityColumns = [
    { key: "time", header: "Time", render: (a) => formatDateTime(a.timestamp) },
    { key: "user", header: "User", render: (a) => <UserCell user={a.user} /> },
    { key: "action", header: "Action", render: (a) => <Badge variant="neutral" size="sm"><span style={{ display: "inline-flex", fontSize: "0.9em" }}>{activityIcon(a.type)}</span> {a.type.replace("_", " ")}</Badge> },
    { key: "desc", header: "Description", render: (a) => a.description },
  ];

  const sessionColumns = [
    { key: "user", header: "User", render: (s) => <UserCell user={s.user} /> },
    { key: "status", header: "Status", render: (s) => <Badge variant={statusVariant(s.status)} size="sm" dot>{s.status}</Badge> },
    { key: "login", header: "Login time", render: (s) => formatDateTime(s.loginTime) },
    { key: "duration", header: "Duration", render: (s) => s.duration },
    { key: "device", header: "Device", render: (s) => <span className={styles.device}>{deviceIcon(s.device)} {s.browser} / {s.os}</span> },
    { key: "last", header: "Last activity", render: (s) => timeSince(s.lastActivity) },
  ];

  const workLogColumns = [
    { key: "user", header: "User", render: (l) => <UserCell user={l.user} onClick={() => openUser(l.user?.id)} /> },
    { key: "date", header: "Date", render: (l) => new Date(l.date).toLocaleDateString() },
    { key: "login", header: "Login", render: (l) => l.formattedLoginTime },
    { key: "active", header: "Active", render: (l) => l.formattedActiveTime },
    { key: "sessions", header: "Sessions", align: "right", render: (l) => l.sessionCount },
    { key: "uploads", header: "Uploads", align: "right", render: (l) => l.activities?.uploads || 0 },
    { key: "downloads", header: "Downloads", align: "right", render: (l) => l.activities?.downloads || 0 },
    { key: "shares", header: "Shares", align: "right", render: (l) => l.activities?.shares || 0 },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<FaChartLine />}
        title="Manager Dashboard"
        subtitle={`Real-time monitoring · updated ${formatTime(lastRefresh)}`}
        actions={
          <>
            <Button variant="ghost" size="md" leftIcon={<FaBroom />} onClick={cleanup}>Cleanup</Button>
            <Button variant="ghost" size="md" onClick={resetAll}>Reset all</Button>
            <Button variant={autoRefresh ? "primary" : "secondary"} size="md" leftIcon={<FaSync />} onClick={() => setAutoRefresh((v) => !v)}>
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
          </>
        }
      />

      {loading && !liveData && (
        <div className={styles.statsWrap}><TableSkeleton rows={2} cols={6} /></div>
      )}

      {liveData && (
        <div className={styles.statsWrap}>
          <StatGrid>
            <StatCard tone="success" icon={<FaUserCheck />}  label="Online now"     value={liveData.onlineCount} />
            <StatCard tone="warning" icon={<FaUserClock />}  label="Idle"           value={liveData.idleCount} />
            <StatCard tone="info"    icon={<FaHistory />}    label="Today's events" value={liveData.todayActivityCount} />
            <StatCard tone="violet"  icon={<FaUpload />}     label="Uploads today"  value={liveData.todayStats?.uploads || 0} />
            <StatCard tone="info"    icon={<FaDownload />}   label="Downloads"      value={liveData.todayStats?.downloads || 0} />
            <StatCard tone="brand"   icon={<FaShare />}      label="Shares"         value={liveData.todayStats?.shares || 0} />
          </StatGrid>
        </div>
      )}

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className={styles.content}>
        {activeTab === "live" && liveData && (
          <div className={styles.live}>
            <section>
              <h2 className={styles.sectionTitle}><FaUsers /> Active users ({liveData.onlineUsers?.length || 0})</h2>
              {(!liveData.onlineUsers || liveData.onlineUsers.length === 0) ? (
                <EmptyState icon={<FaUsers />} title="No one online" description="Active users will appear here in real time." />
              ) : (
                <div className={styles.userGrid}>
                  {liveData.onlineUsers.map((u) => (
                    <Card key={u.userId} variant="surface" elevation={1} padding="md" interactive onClick={() => openUser(u.userId)} className={styles.userCard}>
                      <CardBody style={{ padding: 0 }}>
                        <div className={styles.userTop}>
                          <span className={styles.userAvatar}>
                            <FaUserTie />
                            <span className={styles.statusDot} style={{ background: `var(--${statusVariant(u.status) === "success" ? "success" : statusVariant(u.status) === "warning" ? "warning" : "fg-muted"})` }} />
                          </span>
                          <div>
                            <p className={styles.userName}>{u.username}</p>
                            <p className={styles.userRole}>{u.role}</p>
                          </div>
                        </div>
                        <div className={styles.userMeta}>
                          <span>{deviceIcon(u.device)} {u.browser}</span>
                          <span><FaClock /> {u.sessionDuration}</span>
                        </div>
                        <p className={styles.userFoot}>{activeStatus(u.lastActivity)}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className={styles.sectionTitle}><FaHistory /> Recent activity</h2>
              <div className={styles.feed}>
                {liveData.recentActivities?.map((a) => (
                  <motion.div key={a.id} className={styles.feedItem} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
                    <span className={styles.feedIcon}>{activityIcon(a.type)}</span>
                    <span className={styles.feedDesc}>{a.description}</span>
                    <span className={styles.feedUser}>{a.user?.username}</span>
                    <span className={styles.feedTime}>{timeSince(a.timestamp)}</span>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "activity" && (
          <>
            <Toolbar>
              <select className={styles.select} value={filters.activityType} onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}>
                <option value="">All activities</option>
                <option value="login">Logins</option>
                <option value="logout">Logouts</option>
                <option value="file_upload">Uploads</option>
                <option value="file_download">Downloads</option>
                <option value="file_share">Shares</option>
                <option value="file_delete">Deletes</option>
              </select>
              <select className={styles.select} value={filters.activityPeriod} onChange={(e) => setFilters({ ...filters, activityPeriod: e.target.value })}>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="all">All time</option>
              </select>
            </Toolbar>
            <DataTable columns={activityColumns} rows={activities} rowKey={(a) => a.id}
              empty={<EmptyState icon={<FaHistory />} title="No activities" description="Nothing recorded for this period." />} />
          </>
        )}

        {activeTab === "sessions" && (
          <>
            <Toolbar>
              <select className={styles.select} value={filters.sessionStatus} onChange={(e) => setFilters({ ...filters, sessionStatus: e.target.value })}>
                <option value="active">Active sessions</option>
                <option value="ended">Ended sessions</option>
                <option value="">All sessions</option>
              </select>
            </Toolbar>
            <DataTable columns={sessionColumns} rows={sessions} rowKey={(s) => s.id}
              empty={<EmptyState icon={<FaUsers />} title="No sessions" description="No sessions match this filter." />} />
          </>
        )}

        {activeTab === "worklogs" && (
          <DataTable columns={workLogColumns} rows={workLogs} rowKey={(l) => l.id}
            empty={<EmptyState icon={<FaClock />} title="No work logs" description="Work-hour records will appear here." />} />
        )}

        {activeTab === "stats" && stats && (
          <div className={styles.stats}>
            <Toolbar>
              <select className={styles.select} value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value })}>
                <option value="day">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="year">This year</option>
              </select>
            </Toolbar>
            <div className={styles.statsGrid}>
              <Card variant="surface" elevation={1} padding="md">
                <CardBody style={{ padding: 0 }}>
                  <h3 className={styles.statsTitle}>Overview</h3>
                  <ul className={styles.kvList}>
                    <li><span>Total members</span><strong>{stats.overview?.memberCount}</strong></li>
                    <li><span>Total activities</span><strong>{stats.overview?.totalActivities}</strong></li>
                    <li><span>Total files</span><strong>{stats.overview?.totalFiles}</strong></li>
                  </ul>
                </CardBody>
              </Card>
              <Card variant="surface" elevation={1} padding="md">
                <CardBody style={{ padding: 0 }}>
                  <h3 className={styles.statsTitle}>Activity breakdown</h3>
                  <ul className={styles.kvList}>
                    <li><span><FaSignInAlt /> Logins</span><strong>{stats.activityBreakdown?.logins}</strong></li>
                    <li><span><FaUpload /> Uploads</span><strong>{stats.activityBreakdown?.uploads}</strong></li>
                    <li><span><FaDownload /> Downloads</span><strong>{stats.activityBreakdown?.downloads}</strong></li>
                    <li><span><FaShare /> Shares</span><strong>{stats.activityBreakdown?.shares}</strong></li>
                  </ul>
                </CardBody>
              </Card>
              <Card variant="surface" elevation={1} padding="md">
                <CardBody style={{ padding: 0 }}>
                  <h3 className={styles.statsTitle}>Top active users</h3>
                  <ol className={styles.topUsers}>
                    {stats.topUsers?.map((u, i) => (
                      <li key={u.userId}>
                        <span className={styles.rank}>#{i + 1}</span>
                        <span className={styles.topName}>{u.username}</span>
                        <span className={styles.topTime}>{u.formattedTime}</span>
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(selectedUser && userDetails)}
        onClose={() => { setSelectedUser(null); setUserDetails(null); }}
        title={userDetails?.user?.username}
        description={userDetails ? `${userDetails.user?.role} · ${userDetails.user?.jobTitle || "No title"}` : undefined}
        size="lg"
      >
        {userDetails && (
          <>
            {userDetails.currentSession && (
              <p className={styles.onlineNow}>
                <FaCircle style={{ color: "var(--success)" }} /> Online now · {userDetails.currentSession.duration} · {userDetails.currentSession.device}
              </p>
            )}
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}><span>Total (7d)</span><strong>{userDetails.summary?.formattedLoginTime}</strong></div>
              <div className={styles.summaryItem}><span>Avg daily</span><strong>{userDetails.summary?.formattedAvgDailyTime}</strong></div>
              <div className={styles.summaryItem}><span>Uploads</span><strong>{userDetails.summary?.totalUploads}</strong></div>
              <div className={styles.summaryItem}><span>Downloads</span><strong>{userDetails.summary?.totalDownloads}</strong></div>
              <div className={styles.summaryItem}><span>Shares</span><strong>{userDetails.summary?.totalShares}</strong></div>
              <div className={styles.summaryItem}><span>Files</span><strong>{userDetails.fileStats?.totalFiles}</strong></div>
            </div>
            <h3 className={styles.statsTitle} style={{ marginTop: "var(--space-5)" }}>Recent activity</h3>
            <div className={styles.feed}>
              {userDetails.recentActivities?.slice(0, 10).map((a, i) => (
                <div key={i} className={styles.feedItem}>
                  <span className={styles.feedIcon}>{activityIcon(a.type)}</span>
                  <span className={styles.feedDesc}>{a.description}</span>
                  <span className={styles.feedTime}>{timeSince(a.timestamp)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ManagerDashboard;
