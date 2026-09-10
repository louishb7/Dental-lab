import { Menu } from "lucide-react";
import { Dialog } from "radix-ui";
import ToothIcon from "../icons/ToothIcon.jsx";

export default function AppHeader({ title }) {
  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-header)] px-[var(--space-page-x)] py-2 lg:hidden">
      <Dialog.Trigger
        className="grid size-11 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
        aria-label="Abrir navegação"
      >
        <Menu size={20} />
      </Dialog.Trigger>
      <div className="min-w-0">
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          <ToothIcon size={14} /> Cadisk
        </span>
        <h1 className="truncate text-sm font-semibold">{title}</h1>
      </div>
    </header>
  );
}
