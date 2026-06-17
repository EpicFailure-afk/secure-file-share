import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBuilding, FaPlus, FaKey, FaArrowRight } from "react-icons/fa";
import { Button, Card, CardBody, Badge } from "../../atoms";
import styles from "./OrgSection.module.css";

const OrgSection = ({ organization, role, onOpenOrgModal }) => {
  if (organization) {
    const canManage = ["owner", "manager"].includes(role);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card variant="surface" elevation={1} padding="md" className={styles.orgCard}>
          <CardBody style={{ padding: 0 }}>
            <div className={styles.cardInner}>
              <div className={styles.orgIcon}><FaBuilding /></div>
              <div className={styles.orgMeta}>
                <h3 className={styles.orgName}>{organization.name}</h3>
                <p className={styles.orgRole}>
                  Your role: <Badge variant="brand" size="sm">{role}</Badge>
                </p>
              </div>
              {canManage && (
                <Link to="/organization" style={{ textDecoration: "none" }}>
                  <Button variant="secondary" size="md" rightIcon={<FaArrowRight />}>
                    Manage organization
                  </Button>
                </Link>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card variant="brand" elevation={2} padding="md" className={styles.orgCard}>
        <CardBody style={{ padding: 0 }}>
          <div className={styles.cardInner}>
            <div className={`${styles.orgIcon} ${styles.brand}`}><FaBuilding /></div>
            <div className={styles.orgMeta}>
              <h3 className={styles.orgName}>Collaborate with a team</h3>
              <p className={styles.orgSub}>
                Create an organization to invite teammates, or join an existing one with an invite code.
              </p>
            </div>
            <div className={styles.actions}>
              <Button variant="primary" leftIcon={<FaPlus />} onClick={() => onOpenOrgModal("create")}>
                Create
              </Button>
              <Button variant="secondary" leftIcon={<FaKey />} onClick={() => onOpenOrgModal("join")}>
                Join with code
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default OrgSection;
