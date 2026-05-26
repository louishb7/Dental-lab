import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Settings,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { PRODUCT_NAME } from "../../config/product.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Visão geral", icon: BarChart3 },
  { id: "cases", label: "Casos", icon: ClipboardList },
  { id: "doctors", label: "Dentistas", icon: Stethoscope },
  { id: "services", label: "Serviços", icon: Wrench, disabled: true },
  { id: "finance", label: "Financeiro", icon: CreditCard, disabled: true },
  { id: "settings", label: "Configurações", icon: Settings, disabled: true },
];

export default function AppSidebar({ activePage, onNavigate }) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">C</span>
        <div className="brand-copy">
          <strong>{PRODUCT_NAME}</strong>
          <span>Painel operacional</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={[
                "sidebar-item",
                activePage === item.id ? "active" : "",
                item.disabled ? "disabled" : "",
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

      <div className="sidebar-footer">
        Segunda ferramenta de trabalho para acompanhar casos, prazos e entregas.
      </div>
    </aside>
  );
}

