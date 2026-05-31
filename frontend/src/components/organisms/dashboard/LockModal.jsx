import { FaLock, FaUnlock } from "react-icons/fa";
import { Button, Input } from "../../atoms";
import { FormField, Modal } from "../../molecules";

const LockModal = ({ open, onClose, mode, password, onChange, onConfirm, submitting, error }) => {
  const isLock = mode === "lock";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isLock ? "Lock file with password" : "Unlock file"}
      description={
        isLock
          ? "Set a password. You'll need it to download or unlock this file later."
          : "Enter the password you set when locking this file."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={submitting}
            leftIcon={isLock ? <FaLock /> : <FaUnlock />}
            onClick={onConfirm}
          >
            {isLock ? "Lock file" : "Unlock file"}
          </Button>
        </>
      }
    >
      <FormField
        label="Password"
        required
        hint={isLock ? "At least 4 characters." : undefined}
        error={error || undefined}
      >
        <Input
          type="password"
          value={password}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoFocus
        />
      </FormField>
    </Modal>
  );
};

export default LockModal;
