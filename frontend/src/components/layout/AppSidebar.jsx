import { PanelsTopLeft, ClipboardList, CreditCard, History, Stethoscope } from "lucide-react";
import { PRODUCT_NAME } from "../../config/product.js";
import ToothIcon from "../icons/ToothIcon.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Bancada", icon: PanelsTopLeft },
  { id: "cases", label: "Casos", icon: ClipboardList },
  { id: "history", label: "Histórico", icon: History },
  { id: "doctors", label: "Dentistas", icon: Stethoscope },
  { id: "finance", label: "Financeiro", icon: CreditCard },
];

/**
 * Renders the primary app navigation and Cadisk brand mark.
 */
export default function AppSidebar({ activePage, onNavigate }) {
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

      <nav className="grid gap-1 px-3 py-4" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

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
      <div className="mt-auto px-6 py-6 text-xs text-[var(--color-text-muted)]">Da entrada à entrega.</div>
    </aside>
  );
}
