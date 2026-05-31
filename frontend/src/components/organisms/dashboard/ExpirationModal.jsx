import { useMemo } from "react";
import { FaClock } from "react-icons/fa";
import { Button, Input } from "../../atoms";
import { FormField, Modal } from "../../molecules";
import styles from "./Modals.module.css";

const UNITS = ["seconds", "minutes", "hours", "days"];

const formatExpiry = (value, unit) => {
  const v = Number(value);
  if (!v || v < 1) return null;
  const ms = { seconds: 1000, minutes: 60_000, hours: 3_600_000, days: 86_400_000 }[unit];
  return new Date(Date.now() + v * ms);
};

const ExpirationModal = ({ open, onClose, file, value, unit, onChange, onConfirm, submitting }) => {
  const preview = useMemo(() => formatExpiry(value, unit), [value, unit]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set expiration"
      description={file ? `Set when "${file.fileName}" automatically becomes inaccessible.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={submitting} leftIcon={<FaClock />} onClick={onConfirm}>
            Set expiration
          </Button>
        </>
      }
    >
      <div className={styles.expRow}>
        <FormField label="Value" required>
          <Input
            type="number"
            min="1"
            value={value}
            onChange={(e) => onChange({ value: e.target.value, unit })}
          />
        </FormField>
        <FormField label="Unit">
          <select
            value={unit}
            onChange={(e) => onChange({ value, unit: e.target.value })}
            className={styles.select}
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FormField>
      </div>

      {preview && (
        <p className={styles.previewBox}>
          <FaClock />
          <span>
            Expires <strong>{preview.toLocaleString()}</strong>
          </span>
        </p>
      )}
    </Modal>
  );
};

export default ExpirationModal;
