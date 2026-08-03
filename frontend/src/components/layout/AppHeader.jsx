import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Moon, Sun, User } from "lucide-react";

const NEXT_THEME_ACTION = {
  dark: {
    icon: Sun,
    label: "Tema claro",
  },
  light: {
    icon: Moon,
    label: "Tema escuro",
  },
};

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
  const nextThemeAction = NEXT_THEME_ACTION[theme] || NEXT_THEME_ACTION.dark;
  const ThemeIcon = nextThemeAction.icon;

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

  function handleLogoutSelect() {
    setUserMenuOpen(false);
    onLogout();
  }

  return (
    <header className="sticky top-0 z-[5] flex min-h-16 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-header)] px-[var(--space-page-x)] py-3 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="truncate text-[1.28rem] font-bold leading-tight text-[var(--color-text)]">
          {title}
        </h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <time
          className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]"
          dateTime={getLocalDateTimeValue(currentDate)}
        >
          {today}
        </time>
        <button
          className="inline-grid size-8 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-text-soft)] transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-[var(--color-text)]"
          type="button"
          aria-label={nextThemeAction.label}
          title={nextThemeAction.label}
          onClick={onToggleTheme}
        >
          <ThemeIcon size={16} />
        </button>
        <div className="relative" ref={userMenuRef}>
          <button
            className="inline-flex h-8 max-w-[190px] items-center gap-2 rounded-md px-2 text-sm font-bold text-[var(--color-text-soft)] transition-colors hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)]"
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
              className="absolute right-0 top-[calc(100%+8px)] z-20 grid min-w-[190px] gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-soft)]"
              role="menu"
            >
              <button
                className="flex min-h-9 w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm font-bold text-[var(--color-text-soft)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
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
