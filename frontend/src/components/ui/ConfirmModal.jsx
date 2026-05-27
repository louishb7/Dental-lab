import Button from "./Button.jsx";
import Modal from "./Modal.jsx";

export default function ConfirmModal({
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="confirm-modal-body">
        <p>{description}</p>
        <div className="confirm-modal-actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
