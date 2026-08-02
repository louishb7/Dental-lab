import { X } from "lucide-react";
import Button from "./Button.jsx";
import { cn } from "../../lib/utils.js";

export default function Modal({ title, description, children, onClose, className = "" }) {
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-[rgba(7,10,14,0.72)] p-4"
      role="presentation"
    >
      <section
        className={cn(
          "max-h-[calc(100vh-2rem)] w-full max-w-[820px] overflow-auto rounded-md border border-[rgba(229,235,241,0.13)] bg-[rgba(25,30,38,0.98)] text-[#f3f4f6] shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="grid gap-1">
            <h3 className="text-lg font-bold leading-tight">{title}</h3>
            {description && <p className="text-sm leading-snug text-[#aeb7c2]">{description}</p>}
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
