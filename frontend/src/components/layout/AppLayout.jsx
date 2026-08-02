import AppHeader from "./AppHeader.jsx";
import AppSidebar from "./AppSidebar.jsx";
import Toast from "../ui/Toast.jsx";

const PAGE_META = {
  dashboard: {
    title: "Bancada",
    subtitle: null,
  },
  cases: {
    title: "Casos",
    subtitle: null,
  },
  doctors: {
    title: "Dentistas",
    subtitle: null,
  },
  finance: {
    title: "Financeiro",
    subtitle: null,
  },
};

export default function AppLayout({
  activePage,
  onNavigate,
  session,
  theme,
  onToggleTheme,
  onLogout,
  message,
  onDismiss,
  children,
}) {
  const meta = PAGE_META[activePage] || PAGE_META.dashboard;

  return (
    <div className="app-layout">
      <AppSidebar activePage={activePage} onNavigate={onNavigate} />
      <Toast message={message} onDismiss={onDismiss} />
      <main className="app-main workspace-main">
        <AppHeader
          title={meta.title}
          user={session}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onLogout={onLogout}
        />
        {children}
      </main>
    </div>
  );
}
