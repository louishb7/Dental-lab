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
    <div className="grid min-h-screen grid-cols-[278px_minmax(0,1fr)]">
      <AppSidebar activePage={activePage} onNavigate={onNavigate} />
      <Toast message={message} onDismiss={onDismiss} />
      <main className="flex min-w-0 flex-col bg-[linear-gradient(180deg,rgba(255,138,42,0.02),transparent_14%)]">
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
