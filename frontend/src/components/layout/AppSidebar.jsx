import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Stethoscope,
} from "lucide-react";
import { PRODUCT_NAME } from "../../config/product.js";

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
    <aside className="sticky top-0 flex h-screen flex-col border-r border-[rgba(229,235,241,0.13)] bg-[rgba(18,22,29,0.96)] backdrop-blur">
      <div className="flex min-h-[76px] items-center gap-3 border-b border-[rgba(229,235,241,0.13)] px-5 py-4">
        <span className="grid size-11 place-items-center rounded-lg border border-[rgba(56,189,248,0.32)] bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(42,49,59,0.72))] text-[#38bdf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <FlaskConical size={22} strokeWidth={1.9} />
        </span>
        <div className="grid gap-1">
          <strong className="text-base leading-none text-[#f3f4f6]">{PRODUCT_NAME}</strong>
          <span className="text-xs font-semibold text-[#aeb7c2]">Laboratório dental</span>
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
                  ? "border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.07)] text-[#f3f4f6] shadow-[inset_2px_0_0_#38bdf8]"
                  : "border-transparent bg-transparent text-[#d7dde5] hover:border-[rgba(56,189,248,0.18)] hover:bg-[rgba(56,189,248,0.05)] hover:text-[#f3f4f6]",
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
