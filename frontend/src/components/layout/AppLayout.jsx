import AppHeader from "./AppHeader.jsx";
import AppSidebar from "./AppSidebar.jsx";

const PAGE_META = {
  dashboard: {
    title: "Cadista",
    subtitle: "Panorama dos seus casos, prazos e entregas.",
  },
  cases: {
    title: "Cadista",
    subtitle: "Controle seus prazos, prioridades e entregas.",
  },
  doctors: {
    title: "Cadista",
    subtitle: "Clientes profissionais vinculados aos casos.",
  },
};

export default function AppLayout({
  activePage,
  onNavigate,
  session,
  theme,
  onToggleTheme,
  onRefresh,
  onLogout,
  children,
}) {
  const meta = PAGE_META[activePage] || PAGE_META.dashboard;

  return (
    <div className="app-layout">
      <AppSidebar activePage={activePage} onNavigate={onNavigate} />
      <main className="app-main">
        <AppHeader
          title={meta.title}
          subtitle={meta.subtitle}
          user={session}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onRefresh={onRefresh}
          onLogout={onLogout}
        />
        {children}
      </main>
    </div>
  );
}
