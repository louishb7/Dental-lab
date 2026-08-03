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
      <div className="grid gap-4">
        <p className="text-sm leading-relaxed text-[var(--color-text-soft)]">{description}</p>
        <div className="flex flex-wrap justify-end gap-2">
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
