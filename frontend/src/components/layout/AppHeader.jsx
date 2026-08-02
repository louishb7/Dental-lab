import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Moon, Sun, User } from "lucide-react";

function formatShortDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(" de ", " ")
    .replace(".", "");
}

function getLocalDateTimeValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Renders the global page title and compact session controls.
 */
export default function AppHeader({
  title,
  user,
  theme,
  onToggleTheme,
  onLogout,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const currentDate = new Date();
  const today = formatShortDate(currentDate);

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
    <header className="sticky top-0 z-[5] flex min-h-16 items-center justify-between gap-4 border-b border-[rgba(229,235,241,0.13)] bg-[rgba(19,23,30,0.88)] px-[var(--space-page-x)] py-3 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="truncate text-[1.28rem] font-bold leading-tight text-[#f3f4f6]">
          {title}
        </h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <time
          className="text-xs font-bold uppercase tracking-[0.06em] text-[#aeb7c2]"
          dateTime={getLocalDateTimeValue(currentDate)}
        >
          {today}
        </time>
        <div className="relative" ref={userMenuRef}>
          <button
            className="inline-flex h-8 max-w-[190px] items-center gap-2 rounded-md px-2 text-sm font-bold text-[#d7dde5] transition-colors hover:bg-[rgba(237,237,237,0.06)] hover:text-[#f3f4f6]"
            type="button"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => setUserMenuOpen((current) => !current)}
          >
            <User size={16} />
            <span className="min-w-0 truncate">{user?.username}</span>
            <ChevronDown size={14} />
          </button>
          {userMenuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] z-20 grid min-w-[190px] gap-1 rounded-md border border-[rgba(229,235,241,0.13)] bg-[rgba(25,30,38,0.98)] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
              role="menu"
            >
              <button
                className="flex min-h-9 w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm font-bold text-[#d7dde5] hover:bg-[rgba(42,49,59,0.82)] hover:text-[#f3f4f6]"
                type="button"
                role="menuitem"
                onClick={handleThemeSelect}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Tema claro" : "Tema escuro"}
              </button>
              <button
                className="flex min-h-9 w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm font-bold text-[#d7dde5] hover:bg-[rgba(42,49,59,0.82)] hover:text-[#f3f4f6]"
                type="button"
                role="menuitem"
                onClick={handleLogoutSelect}
              >
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
