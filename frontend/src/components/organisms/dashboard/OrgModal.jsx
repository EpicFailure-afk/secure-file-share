import { FaBuilding, FaKey, FaPlus } from "react-icons/fa";
import { Button, Input, Textarea } from "../../atoms";
import { FormField, Modal } from "../../molecules";
import styles from "./Modals.module.css";

const INDUSTRIES = ["technology", "healthcare", "finance", "education", "government", "retail", "manufacturing", "other"];

const OrgModal = ({ open, onClose, mode, form, onChange, onConfirm, submitting }) => {
  const isCreate = mode === "create";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? "Create organization" : "Join organization"}
      description={
        isCreate
          ? "Your account becomes the owner of the new organization."
          : "Enter the invite code your organization admin sent you."
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={submitting}
            leftIcon={isCreate ? <FaPlus /> : <FaKey />}
            onClick={onConfirm}
          >
            {isCreate ? "Create organization" : "Join organization"}
          </Button>
        </>
      }
    >
      {isCreate ? (
        <>
          <FormField label="Organization name" required>
            <Input
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              placeholder="Acme Co."
              leftIcon={<FaBuilding />}
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              placeholder="Tell teammates what your team does (optional)."
              rows={3}
            />
          </FormField>
          <FormField label="Industry">
            <select
              value={form.industry}
              onChange={(e) => onChange({ ...form, industry: e.target.value })}
              className={styles.select}
            >
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
            </select>
          </FormField>
        </>
      ) : (
        <FormField label="Invite code" required hint="Case-sensitive — paste it exactly.">
          <Input
            value={form.inviteCode}
            onChange={(e) => onChange({ ...form, inviteCode: e.target.value })}
            placeholder="ABCD-1234"
            leftIcon={<FaKey />}
            style={{
              letterSpacing: "0.25em",
              fontFamily: "var(--font-mono)",
            }}
          />
        </FormField>
      )}
    </Modal>
  );
};

export default OrgModal;
