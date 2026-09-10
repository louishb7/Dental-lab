import AppHeader from "./AppHeader.jsx";
import AppSidebar from "./AppSidebar.jsx";
import Toast from "../ui/Toast.jsx";
import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

const PAGE_META = {
  dashboard: {
    title: "Bancada",
    subtitle: null,
  },
  cases: {
    title: "Todos os casos",
    subtitle: null,
  },
  history: {
    title: "Histórico",
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const accountProps = { user: session, theme, onToggleTheme, onLogout };

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setNavigationOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root open={navigationOpen} onOpenChange={setNavigationOpen}>
      <div className="grid min-h-screen lg:grid-cols-[208px_minmax(0,1fr)]">
        <a
          href="#page-content"
          className="sr-only z-50 rounded-md bg-[var(--color-surface)] p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Ir para o conteúdo
        </a>
        <div className="hidden lg:block">
          <AppSidebar activePage={activePage} onNavigate={onNavigate} {...accountProps} />
        </div>
        <Toast message={message} onDismiss={onDismiss} />
        <main className="flex min-w-0 flex-col bg-transparent">
          <AppHeader title={meta.title} />
          <h1 className="sr-only hidden lg:block">{meta.title}</h1>
          <div id="page-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
            {children}
          </div>
        </main>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-[var(--color-overlay)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-40 w-[min(300px,85vw)] shadow-[var(--shadow-soft)]"
        >
          <Dialog.Title className="sr-only">Navegação Cadisk</Dialog.Title>
          <AppSidebar
            activePage={activePage}
            {...accountProps}
            onNavigate={(page) => {
              onNavigate(page);
              setNavigationOpen(false);
            }}
          />
          <Dialog.Close
            className="absolute right-3 top-5 grid size-11 place-items-center rounded-md hover:bg-[var(--color-subtle)]"
            aria-label="Fechar navegação"
          >
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
