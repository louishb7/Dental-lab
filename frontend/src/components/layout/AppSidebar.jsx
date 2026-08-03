import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Stethoscope,
} from "lucide-react";
import { PRODUCT_NAME } from "../../config/product.js";
import ToothIcon from "../icons/ToothIcon.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Bancada", icon: BarChart3 },
  { id: "cases", label: "Casos", icon: ClipboardList },
  { id: "doctors", label: "Dentistas", icon: Stethoscope },
  { id: "finance", label: "Financeiro", icon: CreditCard },
];

/**
 * Renders the primary app navigation and Cadisk brand mark.
 */
export default function AppSidebar({ activePage, onNavigate }) {
  return (
    <aside className="sticky top-0 flex h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] backdrop-blur">
      <div className="flex min-h-[76px] items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <span className="grid size-11 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <ToothIcon size={22} strokeWidth={1.9} />
        </span>
        <div className="grid gap-1">
          <strong className="text-base leading-none text-[var(--color-text)]">{PRODUCT_NAME}</strong>
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">Laboratório dental</span>
        </div>
      </div>

      <nav className="grid gap-1.5 p-4" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              className={[
                "flex min-h-11 items-center gap-3 rounded-md border px-3.5 text-left text-sm font-bold transition-colors",
                isActive
                  ? "border-primary/30 bg-primary/10 text-[var(--color-text)] shadow-[inset_2px_0_0_var(--color-primary)]"
                  : "border-transparent bg-transparent text-[var(--color-text-soft)] hover:border-primary/20 hover:bg-primary/5 hover:text-[var(--color-text)]",
                item.disabled ? "cursor-default opacity-50" : "cursor-pointer",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              disabled={item.disabled}
              onClick={() => !item.disabled && onNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
