import {
  PanelsTopLeft, CreditCard, History, Stethoscope, ChevronUp, LogOut, Moon, Sun, User,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { PRODUCT_NAME } from "../../config/product.js";
import ToothIcon from "../icons/ToothIcon.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Bancada", icon: PanelsTopLeft },
  { id: "history", label: "Histórico", icon: History },
  { id: "doctors", label: "Dentistas", icon: Stethoscope },
  { id: "finance", label: "Financeiro", icon: CreditCard },
];

/**
 * Renders the primary app navigation and Cadisk brand mark.
 */
export default function AppSidebar({ activePage, onNavigate, user, theme, onToggleTheme, onLogout }) {
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? "Tema claro" : "Tema escuro";
  return (
    <aside className="sticky top-0 flex h-dvh flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
      <div className="flex h-20 items-center gap-2.5 px-6">
        <span className="text-primary">
          <ToothIcon size={30} strokeWidth={1.9} />
        </span>
        <div className="grid gap-1">
          <strong className="text-xl font-semibold tracking-tight text-[var(--color-text)]">
            {PRODUCT_NAME}
          </strong>
        </div>
      </div>

      <nav className="grid gap-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = (activePage === "cases" ? "dashboard" : activePage) === item.id;

          return (
            <button
              key={item.id}
              className={[
                "flex min-h-11 items-center gap-3 rounded-md border px-3.5 text-left text-sm font-medium transition-colors",
                isActive
                  ? "border-transparent bg-primary/10 text-primary shadow-[inset_2px_0_0_var(--color-primary)]"
                  : "border-transparent bg-transparent text-[var(--color-text-soft)] hover:border-primary/20 hover:bg-primary/5 hover:text-[var(--color-text)]",
                item.disabled ? "cursor-default opacity-50" : "cursor-pointer",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              aria-current={isActive ? "page" : undefined}
              disabled={item.disabled}
              onClick={() => !item.disabled && onNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mx-3 mt-auto flex shrink-0 items-center gap-1 border-t border-[var(--color-border)] py-3">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-[var(--color-text-soft)] hover:bg-[var(--color-surface-muted)]"
            aria-label={`Conta de ${user?.username}`}
          >
            <User size={18} className="shrink-0" />
            <span className="truncate text-xs font-medium">{user?.username}</span>
            <ChevronUp size={12} className="ml-auto shrink-0" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              side="top"
              sideOffset={8}
              className="z-50 min-w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated-bg)] p-1.5 shadow-[var(--shadow-soft)]"
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
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={onToggleTheme}
        >
          <ThemeIcon size={18} />
        </button>
      </div>
    </aside>
  );
}
