import { X } from "lucide-react";
import Button from "./Button.jsx";

export default function Modal({ title, description, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="panel modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div className="panel-title">
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          <Button variant="ghost" iconOnly aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="panel-body">{children}</div>
      </section>
    </div>
  );
}

