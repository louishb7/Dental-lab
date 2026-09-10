import { Dialog } from "radix-ui";
import { useId, useRef } from "react";
import { X } from "lucide-react";
import Button from "./Button.jsx";
import { cn } from "../../lib/utils.js";

export default function Modal({ title, description, children, onClose, className = "", ariaDescribedBy }) {
  const opener = useRef(document.activeElement);
  const descriptionId = useId();
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-[var(--color-overlay)]" />
        <Dialog.Content
          aria-describedby={ariaDescribedBy || (description ? descriptionId : undefined)}
          className={cn(
            "fixed left-1/2 top-1/2 z-40 flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-soft)] sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]",
            className,
          )}
          onPointerDownOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            // These controlled dialogs have no Dialog.Trigger; restore the opener.
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
          }}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="break-words text-lg font-semibold leading-snug">{title}</Dialog.Title>
              {description && (
                <Dialog.Description
                  id={descriptionId}
                  className="mt-1 text-sm text-[var(--color-text-muted)]"
                >
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" iconOnly aria-label="Fechar">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
