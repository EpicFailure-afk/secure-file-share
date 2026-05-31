import { FaFolderOpen, FaFolderPlus } from "react-icons/fa";
import { Card, CardBody, Button } from "../../atoms";
import { EmptyState } from "../../molecules";
import UploadMenu from "./UploadMenu";
import styles from "./EmptyFiles.module.css";

const EmptyFiles = ({ onUpload, uploading, onNewFolder, inFolder }) => (
  <Card variant="surface" elevation={1} padding="none">
    <CardBody style={{ padding: 0 }}>
      <EmptyState
        icon={<FaFolderOpen />}
        title={inFolder ? "This folder is empty" : "No files yet"}
        description={
          inFolder
            ? "Upload files here, or drag files in from another folder."
            : "Upload your first file or create a folder to organize things. Encryption, scanning, and expiry are on by default."
        }
        action={
          <div className={styles.actions}>
            <Button variant="outline" leftIcon={<FaFolderPlus />} onClick={onNewFolder}>New Folder</Button>
            <UploadMenu onUpload={onUpload} uploading={uploading} size="md" />
          </div>
        }
      />
    </CardBody>
  </Card>
);

export default EmptyFiles;
