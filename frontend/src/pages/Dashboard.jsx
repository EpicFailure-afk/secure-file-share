import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  getUserFiles, uploadFile, deleteFile, shareFile, getUserProfile,
  verifyUserFileIntegrity, lockFile, unlockFile, setFileExpiration,
  downloadFileWithScan, createOrganization, joinOrganization, getOrganizationDetails,
  getFolders, createFolder, updateFolder, deleteFolder, moveFile,
} from "../api";
import { useToast } from "../components/molecules";
import {
  DashboardHeader, OrgSection, FileGrid, FileListSkeleton, EmptyFiles, UploadProgress,
  ShareModal, ExpirationModal, LockModal, IntegrityModal, OrgModal, DeleteFileModal,
  DeleteFolderModal, NewFolderModal, MoveToModal, FileFilterBar, Breadcrumbs,
  HoverPreviewProvider,
} from "../components/organisms/dashboard";
import styles from "./Dashboard.module.css";

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation + filtering
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [filter, setFilter] = useState("all"); // all | files | folders

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  // Modal state
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({ value: 30, unit: "days" });
  const [expSubmitting, setExpSubmitting] = useState(false);

  const [lockOpen, setLockOpen] = useState(false);
  const [lockMode, setLockMode] = useState("lock");
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState("");
  const [lockSubmitting, setLockSubmitting] = useState(false);

  const [integrityOpen, setIntegrityOpen] = useState(false);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityData, setIntegrityData] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Folder modals
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState("create"); // create | rename
  const [folderRenameTarget, setFolderRenameTarget] = useState(null);
  const [folderSubmitting, setFolderSubmitting] = useState(false);

  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const [moveTarget, setMoveTarget] = useState(null);
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  const [orgOpen, setOrgOpen] = useState(false);
  const [orgMode, setOrgMode] = useState("create");
  const [orgForm, setOrgForm] = useState({ name: "", description: "", industry: "other", inviteCode: "" });
  const [orgSubmitting, setOrgSubmitting] = useState(false);

  /* ----------------------------- data fetching ----------------------------- */

  const fetchFiles = useCallback(async () => {
    const res = await getUserFiles();
    if (res.error) {
      if (res.error === "Unauthorized") {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      toast.error({ title: "Couldn't load files", description: res.error });
      return;
    }
    setFiles(res.files || []);
  }, [navigate, toast]);

  const fetchFolders = useCallback(async () => {
    const res = await getFolders();
    if (!res.error) setFolders(res.folders || []);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    (async () => {
      setLoading(true);
      try {
        const profile = await getUserProfile();
        if (profile.error) {
          if (profile.error === "Unauthorized") {
            localStorage.removeItem("token");
            navigate("/login");
            return;
          }
          toast.error({ title: "Profile error", description: profile.error });
        } else {
          setUser(profile.user || null);
          if (profile.user?.organization) {
            const orgRes = await getOrganizationDetails();
            if (!orgRes.error && orgRes.organization) setOrganization(orgRes.organization);
          }
        }
        await Promise.all([fetchFiles(), fetchFolders()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, toast, fetchFiles, fetchFolders]);

  /* ----------------------- derived tree / current view ---------------------- */

  // Index files by their direct folder, folders by their parent
  const filesByFolder = useMemo(() => {
    const map = new Map();
    for (const f of files) {
      const key = f.folderId ? String(f.folderId) : "root";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return map;
  }, [files]);

  const foldersByParent = useMemo(() => {
    const map = new Map();
    for (const f of folders) {
      const key = f.parentFolder ? String(f.parentFolder) : "root";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return map;
  }, [folders]);

  const folderById = useMemo(() => {
    const map = new Map();
    for (const f of folders) map.set(String(f._id), f);
    return map;
  }, [folders]);

  // Recursive count + total size of a folder, plus direct files for the preview
  const folderStats = useCallback((folderId) => {
    const key = (id) => (id ? String(id) : "root");
    let count = 0;
    let size = 0;
    const stack = [String(folderId)];
    while (stack.length) {
      const id = stack.pop();
      for (const f of filesByFolder.get(id) || []) { count += 1; size += f.fileSize || 0; }
      for (const sub of foldersByParent.get(id) || []) stack.push(String(sub._id));
    }
    const children = filesByFolder.get(key(folderId)) || [];
    return { count, size, children };
  }, [filesByFolder, foldersByParent]);

  const currentKey = currentFolderId ? String(currentFolderId) : "root";
  const currentFolders = useMemo(
    () => [...(foldersByParent.get(currentKey) || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [foldersByParent, currentKey],
  );
  const currentFiles = useMemo(() => filesByFolder.get(currentKey) || [], [filesByFolder, currentKey]);

  const displayedFolders = filter === "files" ? [] : currentFolders;
  const displayedFiles = filter === "folders" ? [] : currentFiles;
  const isEmpty = displayedFolders.length === 0 && displayedFiles.length === 0;

  // Breadcrumb trail from root to current folder
  const trail = useMemo(() => {
    const out = [];
    let id = currentFolderId ? String(currentFolderId) : null;
    while (id) {
      const folder = folderById.get(id);
      if (!folder) break;
      out.unshift({ _id: folder._id, name: folder.name });
      id = folder.parentFolder ? String(folder.parentFolder) : null;
    }
    return out;
  }, [currentFolderId, folderById]);

  /* ------------------------------ file actions ------------------------------ */

  const uploadOne = async (file, folderId) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folderId", folderId);
    return uploadFile(formData, setUploadProgress);
  };

  const handleUpload = async (selected, { folder = false } = {}) => {
    const fileArr = Array.from(selected || []);
    if (!fileArr.length) return;

    const tooBig = fileArr.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      toast.error({
        title: "File too large",
        description: `Max ${formatBytes(MAX_FILE_SIZE)}. "${tooBig.name}" is ${formatBytes(tooBig.size)}.`,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      if (folder) {
        await uploadFolderTree(fileArr);
      } else {
        let ok = 0;
        for (const file of fileArr) {
          setUploadFileName(file.name);
          setUploadProgress(0);
          const res = await uploadOne(file, currentFolderId);
          if (res.error) toast.error({ title: `Failed: ${file.name}`, description: res.error });
          else ok += 1;
        }
        if (ok) toast.success({ title: ok === 1 ? "File uploaded" : `${ok} files uploaded`, description: "Scanning in progress." });
      }
      await Promise.all([fetchFiles(), fetchFolders()]);
    } catch (err) {
      console.error("Upload Error:", err);
      toast.error({ title: "Upload failed", description: "Please try again." });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadFileName("");
    }
  };

  // Recreate a picked directory tree under the current folder, then upload files into it
  const uploadFolderTree = async (fileArr) => {
    const pathToId = new Map(); // relative dir path -> created folder id
    const ensureFolder = async (relDir) => {
      if (!relDir) return currentFolderId; // file sits at the chosen folder's root
      if (pathToId.has(relDir)) return pathToId.get(relDir);
      const segments = relDir.split("/");
      const name = segments[segments.length - 1];
      const parentPath = segments.slice(0, -1).join("/");
      const parentId = parentPath ? await ensureFolder(parentPath) : currentFolderId;
      const res = await createFolder({ name, parentFolder: parentId });
      const id = res.folder?._id || null;
      pathToId.set(relDir, id);
      return id;
    };

    let ok = 0;
    for (const file of fileArr) {
      const rel = file.webkitRelativePath || file.name;
      const parts = rel.split("/");
      const dir = parts.slice(0, -1).join("/");
      setUploadFileName(parts[parts.length - 1]);
      setUploadProgress(0);
      const folderId = await ensureFolder(dir);
      const res = await uploadOne(file, folderId);
      if (res.error) toast.error({ title: `Failed: ${file.name}`, description: res.error });
      else ok += 1;
    }
    if (ok) toast.success({ title: "Folder uploaded", description: `${ok} ${ok === 1 ? "file" : "files"} added, structure preserved.` });
  };

  const handleDownload = async (file) => {
    setDownloadingId(file._id);
    try {
      const result = await downloadFileWithScan(file._id, file.fileName);
      if (result.isLocked) {
        toast.warning({ title: "File is locked", description: "Unlock it before downloading." });
        return;
      }
      if (result.error) {
        toast.error({ title: "Download failed", description: result.error });
        return;
      }
      if (result.scanInfo) {
        const { safe, scanTime, message } = result.scanInfo;
        const description = `${message || (safe ? "File is clean." : "File may contain malware.")}${scanTime ? ` · ${scanTime}ms` : ""}`;
        if (safe) toast.success({ title: "Download started", description });
        else      toast.error  ({ title: "Security warning", description });
      }
    } catch (err) {
      console.error("Download Error:", err);
      toast.error({ title: "Download failed", description: "Please try again." });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShare = async (file) => {
    setSelectedFile(file);
    const res = await shareFile(file._id);
    if (res.error) {
      toast.error({ title: "Share failed", description: res.error });
      return;
    }
    setShareUrl(res.shareUrl || "");
    setShareOpen(true);
  };

  const openDelete = (file) => { setDeleteTarget(file); setDeleteOpen(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteFile(deleteTarget._id);
      if (res.error) {
        toast.error({ title: "Delete failed", description: res.error });
      } else {
        setFiles((prev) => prev.filter((f) => f._id !== deleteTarget._id));
        toast.success({ title: "File deleted" });
        setDeleteOpen(false);
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error("Delete Error:", err);
      toast.error({ title: "Delete failed", description: "Please try again." });
    } finally {
      setDeleting(false);
    }
  };

  /* -------------------------------- move flow ------------------------------- */

  const performMove = async (fileId, folderId) => {
    const res = await moveFile(fileId, folderId || null);
    if (res.error) {
      toast.error({ title: "Move failed", description: res.error });
      return false;
    }
    setFiles((prev) => prev.map((f) => (f._id === fileId ? { ...f, folderId: folderId || null } : f)));
    return true;
  };

  // Drag-and-drop onto a folder row or breadcrumb
  const handleDropMove = async (fileId, folderId) => {
    const moved = await performMove(fileId, folderId);
    if (moved) {
      const dest = folderId ? (folderById.get(String(folderId))?.name || "folder") : "My files";
      toast.success({ title: "File moved", description: `Moved to ${dest}.` });
    }
  };

  const confirmMove = async (folderId) => {
    if (!moveTarget) return;
    setMoveSubmitting(true);
    try {
      const moved = await performMove(moveTarget._id, folderId);
      if (moved) {
        toast.success({ title: "File moved" });
        setMoveTarget(null);
      }
    } finally {
      setMoveSubmitting(false);
    }
  };

  /* ------------------------------- folder flow ------------------------------ */

  const openNewFolder = () => { setFolderModalMode("create"); setFolderRenameTarget(null); setFolderModalOpen(true); };
  const openRenameFolder = (folder) => { setFolderModalMode("rename"); setFolderRenameTarget(folder); setFolderModalOpen(true); };

  const confirmFolderModal = async (name) => {
    setFolderSubmitting(true);
    try {
      if (folderModalMode === "rename" && folderRenameTarget) {
        const res = await updateFolder(folderRenameTarget._id, { name });
        if (res.error) { toast.error({ title: "Rename failed", description: res.error }); return; }
        setFolders((prev) => prev.map((f) => (f._id === folderRenameTarget._id ? { ...f, name } : f)));
        toast.success({ title: "Folder renamed" });
      } else {
        const res = await createFolder({ name, parentFolder: currentFolderId });
        if (res.error) { toast.error({ title: "Couldn't create folder", description: res.error }); return; }
        if (res.folder) setFolders((prev) => [...prev, res.folder]);
        toast.success({ title: "Folder created" });
      }
      setFolderModalOpen(false);
    } finally {
      setFolderSubmitting(false);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    setDeletingFolder(true);
    try {
      const res = await deleteFolder(deleteFolderTarget._id);
      if (res.error) { toast.error({ title: "Delete failed", description: res.error }); return; }
      toast.success({
        title: "Folder deleted",
        description: res.deletedFiles ? `${res.deletedFiles} ${res.deletedFiles === 1 ? "file" : "files"} removed.` : undefined,
      });
      setDeleteFolderTarget(null);
      // If we were inside the deleted subtree, step back to root
      if (currentFolderId && (String(currentFolderId) === String(deleteFolderTarget._id) || trail.some((t) => String(t._id) === String(deleteFolderTarget._id)))) {
        setCurrentFolderId(deleteFolderTarget.parentFolder || null);
      }
      await Promise.all([fetchFiles(), fetchFolders()]);
    } finally {
      setDeletingFolder(false);
    }
  };

  /* ----------------------------- expiration flow ---------------------------- */

  const openExpiration = (file) => { setSelectedFile(file); setExpForm({ value: 30, unit: "days" }); setExpOpen(true); };

  const confirmExpiration = async () => {
    if (!selectedFile) return;
    setExpSubmitting(true);
    try {
      const res = await setFileExpiration(selectedFile._id, parseInt(expForm.value, 10), expForm.unit);
      if (res.error) {
        toast.error({ title: "Failed to set expiration", description: res.error });
      } else {
        const when = new Date(res.expiresAt).toLocaleString();
        toast.success({ title: "Expiration set", description: `"${selectedFile.fileName}" expires ${when}.` });
        setExpOpen(false);
        await fetchFiles();
      }
    } finally { setExpSubmitting(false); }
  };

  /* -------------------------------- lock flow ------------------------------- */

  const openLockToggle = (file) => {
    setSelectedFile(file);
    setLockMode(file.isLocked ? "unlock" : "lock");
    setLockPassword("");
    setLockError("");
    setLockOpen(true);
  };

  const confirmLock = async () => {
    if (!selectedFile) return;
    if (!lockPassword) { setLockError("Password is required."); return; }
    if (lockPassword.length < 4) { setLockError("Password must be at least 4 characters."); return; }
    setLockError("");
    setLockSubmitting(true);
    try {
      const fn = lockMode === "lock" ? lockFile : unlockFile;
      const res = await fn(selectedFile._id, lockPassword);
      if (res.error) { setLockError(res.error); return; }
      setFiles((prev) => prev.map((f) => f._id === selectedFile._id ? { ...f, isLocked: lockMode === "lock" } : f));
      toast.success({ title: lockMode === "lock" ? "File locked" : "File unlocked", description: res.message });
      setLockOpen(false);
      setLockPassword("");
      fetchFiles().catch(console.error);
    } catch (err) {
      console.error("Lock/Unlock Error:", err);
      setLockError(`Failed to ${lockMode} file. Please try again.`);
    } finally { setLockSubmitting(false); }
  };

  /* ----------------------------- integrity flow ----------------------------- */

  const openIntegrity = async (file) => {
    setSelectedFile(file);
    setIntegrityData(null);
    setIntegrityLoading(true);
    setIntegrityOpen(true);
    try {
      const result = await verifyUserFileIntegrity(file._id);
      setIntegrityData(result);
    } catch (err) {
      console.error("Integrity check error:", err);
      toast.error({ title: "Integrity check failed", description: "Please try again." });
      setIntegrityOpen(false);
    } finally { setIntegrityLoading(false); }
  };

  /* -------------------------------- org flow -------------------------------- */

  const openOrg = (mode) => {
    setOrgMode(mode);
    setOrgForm({ name: "", description: "", industry: "other", inviteCode: "" });
    setOrgOpen(true);
  };

  const confirmOrg = async () => {
    setOrgSubmitting(true);
    try {
      const res = orgMode === "create"
        ? await createOrganization({ name: orgForm.name, description: orgForm.description, industry: orgForm.industry })
        : await joinOrganization({ inviteCode: orgForm.inviteCode });

      if (res.error) {
        toast.error({ title: orgMode === "create" ? "Couldn't create org" : "Couldn't join org", description: res.error });
        return;
      }

      toast.success({
        title: orgMode === "create" ? "Organization created" : "Joined organization",
        description: res.message || (orgMode === "create" ? `"${res.organization?.name}" is ready.` : "Welcome aboard."),
      });
      setOrgOpen(false);

      const profileRes = await getUserProfile();
      if (profileRes.user) {
        setUser(profileRes.user);
        if (profileRes.user.organization) {
          const orgRes = await getOrganizationDetails();
          if (orgRes.organization) setOrganization(orgRes.organization);
        }
      }
    } finally { setOrgSubmitting(false); }
  };

  /* --------------------------------- render --------------------------------- */

  const fileHandlers = {
    onDownload: handleDownload,
    onShare: handleShare,
    onDelete: openDelete,
    onLockToggle: openLockToggle,
    onSetExpiration: openExpiration,
    onVerifyIntegrity: openIntegrity,
    onMove: setMoveTarget,
  };

  const folderHandlers = {
    onOpen: (folder) => setCurrentFolderId(folder._id),
    onRename: openRenameFolder,
    onDelete: setDeleteFolderTarget,
    onDropFile: handleDropMove,
  };

  return (
    <HoverPreviewProvider viewKey={`${currentFolderId ?? "root"}:${filter}`}>
      <div className={styles.page}>
        <DashboardHeader user={user} onUpload={handleUpload} uploading={uploading} onNewFolder={openNewFolder} />

        <OrgSection organization={organization} role={user?.role} onOpenOrgModal={openOrg} />

        <UploadProgress visible={uploading} progress={uploadProgress} fileName={uploadFileName} />

        <div className={styles.toolbar}>
          <Breadcrumbs trail={trail} onNavigate={setCurrentFolderId} onDropFile={handleDropMove} />
          <FileFilterBar value={filter} onChange={setFilter} />
        </div>

        <motion.section className={styles.filesSection}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <FileListSkeleton rows={4} />
              </motion.div>
            ) : isEmpty ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <EmptyFiles onUpload={handleUpload} uploading={uploading} onNewFolder={openNewFolder} inFolder={currentFolderId !== null} />
              </motion.div>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <FileGrid
                  folders={displayedFolders}
                  files={displayedFiles}
                  downloadingId={downloadingId}
                  ownerName={user?.username}
                  folderStats={folderStats}
                  fileHandlers={fileHandlers}
                  folderHandlers={folderHandlers}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* --- Modals --- */}
        <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} file={selectedFile} shareUrl={shareUrl} />

        <ExpirationModal
          open={expOpen}
          onClose={() => setExpOpen(false)}
          file={selectedFile}
          value={expForm.value}
          unit={expForm.unit}
          onChange={setExpForm}
          onConfirm={confirmExpiration}
          submitting={expSubmitting}
        />

        <LockModal
          open={lockOpen}
          onClose={() => { setLockOpen(false); setLockError(""); }}
          mode={lockMode}
          password={lockPassword}
          onChange={setLockPassword}
          onConfirm={confirmLock}
          submitting={lockSubmitting}
          error={lockError}
        />

        <IntegrityModal open={integrityOpen} onClose={() => setIntegrityOpen(false)} loading={integrityLoading} data={integrityData} />

        <DeleteFileModal
          open={deleteOpen}
          onClose={() => { if (!deleting) { setDeleteOpen(false); setDeleteTarget(null); } }}
          file={deleteTarget}
          onConfirm={confirmDelete}
          submitting={deleting}
        />

        <DeleteFolderModal
          open={Boolean(deleteFolderTarget)}
          onClose={() => { if (!deletingFolder) setDeleteFolderTarget(null); }}
          folder={deleteFolderTarget}
          fileCount={deleteFolderTarget ? folderStats(deleteFolderTarget._id).count : 0}
          onConfirm={confirmDeleteFolder}
          submitting={deletingFolder}
        />

        <NewFolderModal
          open={folderModalOpen}
          onClose={() => { if (!folderSubmitting) setFolderModalOpen(false); }}
          mode={folderModalMode}
          initialName={folderRenameTarget?.name || ""}
          parentName={trail.length ? trail[trail.length - 1].name : null}
          onConfirm={confirmFolderModal}
          submitting={folderSubmitting}
        />

        <MoveToModal
          open={Boolean(moveTarget)}
          onClose={() => { if (!moveSubmitting) setMoveTarget(null); }}
          file={moveTarget}
          folders={folders}
          onConfirm={confirmMove}
          submitting={moveSubmitting}
        />

        <OrgModal
          open={orgOpen}
          onClose={() => setOrgOpen(false)}
          mode={orgMode}
          form={orgForm}
          onChange={setOrgForm}
          onConfirm={confirmOrg}
          submitting={orgSubmitting}
        />
      </div>
    </HoverPreviewProvider>
  );
};

export default Dashboard;
