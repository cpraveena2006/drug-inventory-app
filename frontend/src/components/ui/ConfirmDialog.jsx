import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

const ConfirmDialog = ({ title = "Confirm action", message, confirmLabel = "Delete", onConfirm, onClose, busy = false }) => (
  <Modal title={title} onClose={onClose} className="confirm-modal" labelledBy="confirm-dialog-title">
    <div className="confirm-dialog-content"><span className="confirm-warning-icon"><AlertTriangle size={21} /></span><p>{message}</p></div>
    <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" variant="danger" disabled={busy} onClick={onConfirm}>{busy ? "Deleting..." : confirmLabel}</Button></div>
  </Modal>
);

export default ConfirmDialog;
