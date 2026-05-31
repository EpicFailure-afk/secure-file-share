import { useEffect, useState } from "react";
import { FaFolderPlus, FaPen } from "react-icons/fa";
import { Button, Input } from "../../atoms";
import { FormField, Modal } from "../../molecules";

const NewFolderModal = ({ open, onClose, onConfirm, submitting, parentName, mode = "create", initialName = "" }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const isRename = mode === "rename";

  useEffect(() => {
    if (open) { setName(isRename ? initialName : ""); setError(""); }
  }, [open, isRename, initialName]);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Folder name is required."); return; }
    onConfirm?.(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRename ? "Rename folder" : "New folder"}
      description={
        isRename
          ? "Give this folder a new name."
          : parentName
            ? `Create a folder inside "${parentName}".`
            : "Create a folder at the top level."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" leftIcon={isRename ? <FaPen /> : <FaFolderPlus />} loading={submitting} onClick={submit}>
            {isRename ? "Save name" : "Create folder"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <FormField label="Folder name" required error={error || undefined}>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
            placeholder="e.g. Invoices"
            leftIcon={<FaFolderPlus />}
            autoFocus
            maxLength={120}
          />
        </FormField>
      </form>
    </Modal>
  );
};

export default NewFolderModal;
