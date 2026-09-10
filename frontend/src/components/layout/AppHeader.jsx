import { ChevronDown, LogOut, Menu, Moon, Sun, User } from "lucide-react";
import { Dialog, DropdownMenu } from "radix-ui";
import ToothIcon from "../icons/ToothIcon.jsx";

export default function AppHeader({ title, user, theme, onToggleTheme, onLogout }) {
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? "Tema claro" : "Tema escuro";
  return (
    <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-header)] px-[var(--space-page-x)] py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Dialog.Trigger
          className="grid size-11 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] lg:hidden"
          aria-label="Abrir navegação"
        >
          <Menu size={20} />
        </Dialog.Trigger>
        <div className="min-w-0">
          <span className="mb-0.5 flex items-center gap-1 text-xs font-medium text-primary lg:hidden">
            <ToothIcon size={14} /> Cadisk
          </span>
          <h1 className="truncate text-base font-semibold">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <time
          className="hidden text-xs text-[var(--color-text-muted)] sm:block"
          dateTime={new Date().toLocaleDateString("en-CA")}
        >
          {new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date())}
        </time>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={onToggleTheme}
        >
          <ThemeIcon size={18} />
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className="flex h-11 max-w-40 items-center gap-2 rounded-md px-2 text-[var(--color-text-soft)] hover:bg-[var(--color-surface-muted)]"
            aria-label={`Conta de ${user?.username}`}
          >
            <User size={18} />
            <span className="hidden truncate text-xs font-medium md:inline">{user?.username}</span>
            <ChevronDown size={12} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-soft)]"
            >
              <DropdownMenu.Label className="max-w-64 truncate px-3 py-2 text-xs text-[var(--color-text-muted)]">
                {user?.username}
              </DropdownMenu.Label>
              <DropdownMenu.Item
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm outline-none focus:bg-[var(--color-surface-muted)]"
                onSelect={onLogout}
              >
                <LogOut size={16} /> Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
