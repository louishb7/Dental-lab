import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import Button from "./Button.jsx";
import { cn } from "../../lib/utils.js";
import { createPortal } from "react-dom";

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

  return createPortal(
    <div
      className={cn(
        "pointer-events-auto fixed top-5 right-5 z-[60] flex min-w-[280px] max-w-[420px] items-center gap-3 rounded-lg border p-3.5 text-sm font-medium shadow-[var(--shadow-soft)] max-[640px]:left-3 max-[640px]:right-3 max-[640px]:top-3 max-[640px]:min-w-0 max-[640px]:max-w-none",
        message.type === "success"
          ? "border-[color-mix(in_srgb,var(--color-success)_28%,transparent)] bg-[var(--color-surface)] text-[var(--color-success-soft)]"
          : "border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[var(--color-surface)] text-[var(--color-danger-soft)]",
      )}
      role={message.type === "success" ? "status" : "alert"}
      aria-live={message.type === "success" ? "polite" : "assertive"}
    >
      <Icon size={18} aria-hidden="true" className="shrink-0" />
      <span className="flex-1 leading-snug">{message.text}</span>
      <Button variant="ghost" size="sm" iconOnly aria-label="Fechar aviso" onClick={onDismiss}>
        <X size={16} />
      </Button>
    </div>,
    document.body,
  );
}
