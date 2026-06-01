import {
  FaCheckCircle, FaVirus, FaClock, FaSync, FaExclamationTriangle,
  FaBan, FaCrown,
} from "react-icons/fa";
import { Badge } from "../../atoms";

const ROLE_VARIANT = {
  owner: "warning",
  superadmin: "danger",
  admin: "danger",
  manager: "info",
  staff: "success",
};

export const RoleBadge = ({ role }) => (
  <Badge variant={ROLE_VARIANT[role] || "neutral"} size="sm">
    {role === "owner" && <FaCrown style={{ marginRight: 2 }} />}
    {role}
  </Badge>
);

const SCAN = {
  clean:    { variant: "success", icon: <FaCheckCircle />,          label: "Clean" },
  infected: { variant: "danger",  icon: <FaVirus />,                label: "Infected" },
  pending:  { variant: "warning", icon: <FaClock />,                label: "Pending" },
  scanning: { variant: "info",    icon: <FaSync />,                 label: "Scanning" },
  error:    { variant: "warning", icon: <FaExclamationTriangle />,  label: "Error" },
  unavailable: { variant: "warning", icon: <FaExclamationTriangle />, label: "Not scanned" },
};

export const ScanBadge = ({ status }) => {
  const cfg = SCAN[status] || SCAN.pending;
  return (
    <Badge variant={cfg.variant} size="sm">
      <span style={{ display: "inline-flex", fontSize: "0.9em" }}>{cfg.icon}</span> {cfg.label}
    </Badge>
  );
};

export const FileStatusBadge = ({ file }) => {
  if (file.isRevoked) {
    return <Badge variant="danger" size="sm"><FaBan style={{ marginRight: 2 }} /> Revoked</Badge>;
  }
  if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
    return <Badge variant="warning" size="sm"><FaClock style={{ marginRight: 2 }} /> Expired</Badge>;
  }
  return <Badge variant="success" size="sm"><FaCheckCircle style={{ marginRight: 2 }} /> Active</Badge>;
};
