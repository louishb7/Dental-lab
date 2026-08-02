import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, LogOut, Moon, Sun, User } from "lucide-react";

export default function AppHeader({
  title,
  user,
  theme,
  onToggleTheme,
  onLogout,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const today = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    function handlePointerDown(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleThemeSelect() {
    onToggleTheme();
    setUserMenuOpen(false);
  }

  function handleLogoutSelect() {
    setUserMenuOpen(false);
    onLogout();
  }

  return (
    <header className="app-header">
      <div className="header-title">
        <span className="page-kicker page-kicker-accent">Cadista</span>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <span className="session-pill">
          <CalendarDays size={16} />
          {today}
        </span>
        <div className="user-menu" ref={userMenuRef}>
          <button
            className="button button-ghost button-sm user-menu-trigger"
            type="button"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => setUserMenuOpen((current) => !current)}
          >
            <User size={16} />
            <span>{user?.username}</span>
            <ChevronDown size={14} />
          </button>
          {userMenuOpen && (
            <div className="user-menu-popover" role="menu">
              <button type="button" role="menuitem" onClick={handleThemeSelect}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Tema claro" : "Tema escuro"}
              </button>
              <button type="button" role="menuitem" onClick={handleLogoutSelect}>
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
