import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import Button from "./Button.jsx";

export default function Toast({ message, onDismiss }) {
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message) return undefined;

    const timeout = window.setTimeout(() => {
      dismissRef.current?.();
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message) return null;

  const Icon = message.type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`toast ${message.type}`} role="status" aria-live="polite">
      <Icon className="toast-icon" size={18} aria-hidden="true" />
      <span className="toast-text">{message.text}</span>
      <Button variant="ghost" size="sm" iconOnly aria-label="Fechar aviso" onClick={onDismiss}>
        <X size={16} />
      </Button>
    </div>
  );
}
