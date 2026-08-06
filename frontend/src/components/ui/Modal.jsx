import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import Button from "./Button.jsx";
import { cn } from "../../lib/utils.js";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    const isHidden = element.hidden || element.getAttribute("aria-hidden") === "true";
    return !isHidden && element.getClientRects().length > 0;
  });
}

export default function Modal({
  title,
  description,
  children,
  onClose,
  className = "",
  ariaDescribedBy,
}) {
  const dialogRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement;

    const focusableElements = getFocusableElements(dialogRef.current);
    const initialFocusTarget = focusableElements[0] || dialogRef.current;
    initialFocusTarget?.focus({ preventScroll: true });

    return () => {
      const previousActiveElement = previousActiveElementRef.current;
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus({ preventScroll: true });
      }
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements(dialogRef.current);
    if (!focusableElements.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (!dialogRef.current?.contains(activeElement)) {
      event.preventDefault();
      (event.shiftKey ? lastElement : firstElement).focus();
      return;
    }

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-[var(--color-overlay)] p-4"
      role="presentation"
    >
      <section
        ref={dialogRef}
        className={cn(
          "max-h-[calc(100vh-2rem)] w-full max-w-[820px] overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-soft)]",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy || (description ? descriptionId : undefined)}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="grid gap-1">
            <h3 id={titleId} className="text-lg font-bold leading-tight">{title}</h3>
            {description && <p id={descriptionId} className="text-sm leading-snug text-[var(--color-text-muted)]">{description}</p>}
          </div>
          <Button variant="ghost" iconOnly aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
