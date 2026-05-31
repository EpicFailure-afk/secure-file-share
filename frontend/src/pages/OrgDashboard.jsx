import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaBuilding, FaUsers, FaUserPlus, FaUserCheck, FaUserCog, FaCog, FaChartBar,
  FaFile, FaClock, FaKey, FaCopy, FaSync, FaCheck, FaTimes, FaTrash, FaSearch,
  FaHdd, FaSignOutAlt, FaCrown,
} from "react-icons/fa";
import { Button, IconButton, Input, Textarea, Card, CardBody } from "../components/atoms";
import { FormField, Modal, EmptyState, useToast } from "../components/molecules";
import {
  PageHeader, TabBar, StatCard, StatGrid, DataTable, Pagination, Toolbar, TableSkeleton,
} from "../components/organisms/shared";
import { RoleBadge } from "../components/organisms/shared/badges";
import {
  getOrganizationDetails, getOrganizationStats, getOrganizationMembers, approveMember,
  updateMemberRole, removeMember, regenerateInviteCode, updateOrganizationSettings,
  leaveOrganization, transferOwnership, deleteOrganization, getUserProfile,
} from "../api";
import styles from "./OrgDashboard.module.css";

const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const OrgDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [organization, setOrganization] = useState(null);
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [actionLoading, setActionLoading] = useState(null);
  const [copied, setCopied] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    const res = await getOrganizationStats();
    if (!res.error) setStats(res.stats);
  }, []);

  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true);
    const filters = {};
    if (searchQuery) filters.search = searchQuery;
    if (roleFilter) filters.role = roleFilter;
    const res = await getOrganizationMembers(page, 20, filters);
    if (res.error) toast.error({ title: "Couldn't load members", description: res.error });
    else { setMembers(res.members || []); setPagination(res.pagination || { page: 1, pages: 1 }); }
    setLoading(false);
  }, [searchQuery, roleFilter, toast]);

  const fetchPending = useCallback(async () => {
    const res = await getOrganizationMembers(1, 50, { status: "pending" });
    if (!res.error) setPendingMembers(res.members || []);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    (async () => {
      setLoading(true);
      const [profileRes, orgRes] = await Promise.all([getUserProfile(), getOrganizationDetails()]);
      if (profileRes.error || !profileRes.user) { navigate("/login"); return; }
      setUserProfile(profileRes.user);
      if (orgRes.error || !orgRes.organization) { navigate("/dashboard"); return; }
      setOrganization(orgRes.organization);
      if (!["admin", "owner", "manager", "superadmin"].includes(profileRes.user.role)) { navigate("/dashboard"); return; }
      await fetchStats();
      await fetchPending();
      setLoading(false);
    })();
  }, [navigate, fetchStats, fetchPending]);

  useEffect(() => {
    if (activeTab === "members") fetchMembers();
    else if (activeTab === "pending") fetchPending();
    else if (activeTab === "overview") fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const isOwner = organization?.owner?._id === userProfile?._id || organization?.owner === userProfile?._id;
  const canManage = ["admin", "owner"].includes(userProfile?.role);

  /* -------------------------------- actions -------------------------------- */
  const approve = async (memberId, action) => {
    setActionLoading(memberId);
    const res = await approveMember(memberId, action);
    if (res.error) toast.error({ title: "Action failed", description: res.error });
    else { toast.success({ title: action === "approve" ? "Member approved" : "Request rejected", description: res.message }); fetchPending(); fetchStats(); }
    setActionLoading(null);
  };

  const changeRole = async (memberId, newRole) => {
    setActionLoading(memberId);
    const res = await updateMemberRole(memberId, newRole);
    if (res.error) toast.error({ title: "Couldn't update role", description: res.error });
    else { toast.success({ title: "Role updated", description: res.message }); fetchMembers(); }
    setActionLoading(null);
  };

  const remove = async (memberId) => {
    if (!window.confirm("Remove this member?")) return;
    setActionLoading(memberId);
    const res = await removeMember(memberId);
    if (res.error) toast.error({ title: "Couldn't remove member", description: res.error });
    else { toast.success({ title: "Member removed", description: res.message }); fetchMembers(); fetchStats(); }
    setActionLoading(null);
  };

  const regenerate = async () => {
    setActionLoading("invite");
    const res = await regenerateInviteCode(72);
    if (res.error) toast.error({ title: "Couldn't regenerate", description: res.error });
    else { setOrganization((p) => ({ ...p, inviteCode: res.inviteCode, inviteCodeExpires: res.expiresAt })); toast.success({ title: "Invite code regenerated" }); }
    setActionLoading(null);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(organization?.inviteCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const leave = async () => {
    if (!window.confirm("Leave this organization?")) return;
    const res = await leaveOrganization();
    if (res.error) toast.error({ title: "Couldn't leave", description: res.error });
    else navigate("/dashboard");
  };

  const confirmDelete = async () => {
    const res = await deleteOrganization();
    if (res.error) toast.error({ title: "Couldn't delete", description: res.error });
    else navigate("/dashboard");
  };

  const confirmTransfer = async () => {
    if (!transferTarget) { toast.warning({ title: "Pick a member first" }); return; }
    const res = await transferOwnership(transferTarget);
    if (res.error) toast.error({ title: "Transfer failed", description: res.error });
    else { toast.success({ title: "Ownership transferred" }); setTransferOpen(false); setTransferTarget(""); }
  };

  const saveSettings = async () => {
    const res = await updateOrganizationSettings({
      name: organization.name,
      description: organization.description,
      settings: organization.settings,
    });
    if (res.error) toast.error({ title: "Couldn't save", description: res.error });
    else toast.success({ title: "Settings saved" });
  };

  const TABS = [
    { id: "overview", label: "Overview", icon: <FaChartBar /> },
    { id: "members",  label: "Members",  icon: <FaUsers /> },
    ...(["admin", "owner", "superadmin"].includes(userProfile?.role)
      ? [{ id: "pending", label: "Pending", icon: <FaUserPlus />, count: pendingMembers.length }] : []),
    ...(isOwner ? [{ id: "settings", label: "Settings", icon: <FaCog /> }] : []),
  ];

  const memberColumns = [
    {
      key: "member", header: "Member",
      render: (m) => (
        <div className={styles.memberCell}>
          <span className={styles.avatar}>{m.username?.charAt(0).toUpperCase()}</span>
          <div>
            <p className={styles.memberName}>{m.username}</p>
            <p className={styles.memberEmail}>{m.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (m) => <RoleBadge role={m.role} /> },
    { key: "department", header: "Department", render: (m) => m.department || "—" },
    { key: "createdAt", header: "Joined", render: (m) => formatDate(m.createdAt) },
    {
      key: "actions", header: "Actions", align: "right",
      render: (m) => m.role === "owner" ? null : (
        <div className={styles.rowActions}>
          {canManage && (
            <select className={styles.miniSelect} value={m.role} disabled={actionLoading === m._id} onChange={(e) => changeRole(m._id, e.target.value)}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              {isOwner && <option value="admin">Admin</option>}
            </select>
          )}
          {canManage && (
            <IconButton aria-label="Remove member" variant="danger" size="sm" disabled={actionLoading === m._id} onClick={() => remove(m._id)}><FaTrash /></IconButton>
          )}
        </div>
      ),
    },
  ];

  if (loading && !organization) {
    return <div className={styles.page}><TableSkeleton rows={3} cols={4} /></div>;
  }

  return (
    <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHeader
        icon={<FaBuilding />}
        title={organization?.name}
        subtitle={`${organization?.subscription?.plan || "free"} plan`}
        actions={!isOwner && (
          <Button variant="ghost" leftIcon={<FaSignOutAlt />} onClick={leave}>Leave organization</Button>
        )}
      />

      {/* Invite code card */}
      <Card variant="surface" elevation={1} padding="md" className={styles.inviteCard}>
        <CardBody style={{ padding: 0 }}>
          <div className={styles.inviteInner}>
            <div className={styles.inviteIcon}><FaKey /></div>
            <div className={styles.inviteMeta}>
              <h3 className={styles.inviteTitle}>Invite code</h3>
              <p className={styles.inviteSub}>Share this code to invite new members</p>
            </div>
            <div className={styles.inviteCodeRow}>
              <code className={styles.code}>{organization?.inviteCode || "N/A"}</code>
              <IconButton aria-label="Copy invite code" variant="glass" size="sm" onClick={copyCode}>{copied ? <FaCheck /> : <FaCopy />}</IconButton>
              {["admin", "owner"].includes(userProfile?.role) && (
                <IconButton aria-label="Regenerate invite code" variant="glass" size="sm" disabled={actionLoading === "invite"} onClick={regenerate}><FaSync /></IconButton>
              )}
            </div>
          </div>
          {organization?.inviteCodeExpires && (
            <p className={styles.inviteExpiry}><FaClock /> Expires {formatDate(organization.inviteCodeExpires)}</p>
          )}
        </CardBody>
      </Card>

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className={styles.content}>
        {activeTab === "overview" && stats && (
          <div className={styles.overview}>
            <StatGrid>
              <StatCard tone="info"    icon={<FaUsers />}    label="Total members"     value={stats.users?.totalUsers || 0}   detail={`${stats.users?.activeUsers || 0} active`} />
              <StatCard tone="warning" icon={<FaUserPlus />} label="Pending approvals" value={stats.users?.pendingUsers || 0} detail="awaiting review" />
              <StatCard tone="success" icon={<FaFile />}     label="Total files"       value={stats.files?.totalFiles || 0}   detail={formatBytes(stats.files?.totalSize || 0)} />
              <StatCard tone="brand"   icon={<FaHdd />}      label="Storage used"      value={formatBytes(stats.users?.totalStorage || 0)} detail={`of ${formatBytes(organization?.settings?.totalStorageLimit || 0)}`} />
            </StatGrid>

            <Card variant="surface" elevation={1} padding="md">
              <CardBody style={{ padding: 0 }}>
                <h3 className={styles.cardTitle}><FaUserCog /> Role distribution</h3>
                <div className={styles.roleDist}>
                  {Object.entries(stats.roles || {}).map(([role, count]) => (
                    <div key={role} className={styles.roleDistItem}>
                      <RoleBadge role={role} />
                      <span className={styles.roleCount}>{count}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === "members" && (
          <>
            <Toolbar>
              <span className="grow">
                <Input placeholder="Search members…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchMembers()} leftIcon={<FaSearch />} />
              </span>
              <select className={styles.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
              <Button variant="secondary" onClick={() => fetchMembers()}>Search</Button>
            </Toolbar>
            {loading ? <TableSkeleton rows={6} cols={5} /> : (
              <>
                <DataTable
                  columns={memberColumns}
                  rows={members}
                  rowKey={(m) => m._id}
                  empty={<EmptyState icon={<FaUsers />} title="No members found" description="Try a different search or filter." />}
                />
                <Pagination page={pagination.page} pages={pagination.pages} onChange={fetchMembers} />
              </>
            )}
          </>
        )}

        {activeTab === "pending" && (
          pendingMembers.length === 0 ? (
            <EmptyState icon={<FaUserCheck />} title="No pending requests" description="New join requests will appear here." />
          ) : (
            <div className={styles.pendingList}>
              {pendingMembers.map((m) => (
                <Card key={m._id} variant="surface" elevation={1} padding="md">
                  <CardBody style={{ padding: 0 }}>
                    <div className={styles.pendingRow}>
                      <div className={styles.memberCell}>
                        <span className={styles.avatar}>{m.username?.charAt(0).toUpperCase()}</span>
                        <div>
                          <p className={styles.memberName}>{m.username}</p>
                          <p className={styles.memberEmail}>{m.email}</p>
                          <p className={styles.pendingMeta}>
                            {m.jobTitle && `${m.jobTitle} · `}{m.department && `${m.department} · `}requested as {m.role}
                          </p>
                        </div>
                      </div>
                      <div className={styles.pendingActions}>
                        <Button variant="primary" size="sm" leftIcon={<FaCheck />} disabled={actionLoading === m._id} onClick={() => approve(m._id, "approve")}>Approve</Button>
                        <Button variant="ghost" size="sm" leftIcon={<FaTimes />} disabled={actionLoading === m._id} onClick={() => approve(m._id, "reject")}>Reject</Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === "settings" && isOwner && (
          <div className={styles.settings}>
            <Card variant="surface" elevation={1} padding="lg">
              <CardBody style={{ padding: 0 }}>
                <h3 className={styles.cardTitle}><FaCog /> Organization settings</h3>
                <div className={styles.settingsForm}>
                  <FormField label="Organization name">
                    <Input value={organization?.name || ""} onChange={(e) => setOrganization((p) => ({ ...p, name: e.target.value }))} />
                  </FormField>
                  <FormField label="Description">
                    <Textarea value={organization?.description || ""} onChange={(e) => setOrganization((p) => ({ ...p, description: e.target.value }))} rows={3} />
                  </FormField>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={organization?.settings?.requireApprovalForNewUsers || false}
                      onChange={(e) => setOrganization((p) => ({ ...p, settings: { ...p.settings, requireApprovalForNewUsers: e.target.checked } }))}
                    />
                    Require approval for new members
                  </label>
                  <div>
                    <Button variant="primary" onClick={saveSettings}>Save settings</Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card variant="outline" elevation={0} padding="lg" className={styles.dangerZone}>
              <CardBody style={{ padding: 0 }}>
                <h3 className={styles.dangerTitle}>Danger zone</h3>
                <div className={styles.dangerActions}>
                  <Button variant="secondary" leftIcon={<FaCrown />} onClick={() => setTransferOpen(true)}>Transfer ownership</Button>
                  <Button variant="danger" leftIcon={<FaTrash />} onClick={() => setDeleteOpen(true)}>Delete organization</Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete organization"
        description="This cannot be undone. All members will be removed."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" leftIcon={<FaTrash />} onClick={confirmDelete}>Delete organization</Button>
          </>
        }
      >
        <p>Type-safe confirmation aside, deleting <strong>{organization?.name}</strong> is permanent.</p>
      </Modal>

      <Modal
        open={transferOpen}
        onClose={() => { setTransferOpen(false); setTransferTarget(""); }}
        title="Transfer ownership"
        description="Select a member to become the new owner."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setTransferOpen(false); setTransferTarget(""); }}>Cancel</Button>
            <Button variant="primary" leftIcon={<FaCrown />} disabled={!transferTarget} onClick={confirmTransfer}>Transfer</Button>
          </>
        }
      >
        <FormField label="New owner">
          <select className={styles.select} style={{ width: "100%" }} value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}>
            <option value="">Select a member</option>
            {members.filter((m) => m._id !== userProfile?._id).map((m) => (
              <option key={m._id} value={m._id}>{m.username} ({m.email})</option>
            ))}
          </select>
        </FormField>
      </Modal>
    </motion.div>
  );
};

export default OrgDashboard;
