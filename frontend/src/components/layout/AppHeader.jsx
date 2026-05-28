import { CalendarDays, LogOut, Moon, RefreshCw, Sun, User } from "lucide-react";
import Button from "../ui/Button.jsx";

export default function AppHeader({
  title,
  user,
  theme,
  onToggleTheme,
  onRefresh,
  onLogout,
}) {
  const today = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="app-header">
      <div className="header-title">
        <span className="page-kicker page-kicker-accent">Cadista</span>
        <h1>{title}</h1>
        <p className="header-subtitle">Controle simples de casos, serviços, prazos e entregas.</p>
      </div>
      <div className="header-actions">
        <span className="session-pill">
          <CalendarDays size={16} />
          {today}
        </span>
        <span className="session-pill">
          <User size={16} />
          {user?.username}
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "Claro" : "Escuro"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw size={16} />
          Atualizar
        </Button>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut size={16} />
          Sair
        </Button>
      </div>
    </header>
  );
}
