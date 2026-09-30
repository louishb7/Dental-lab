import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import ConfirmModal from "./components/ui/ConfirmModal.jsx";
import Modal from "./components/ui/Modal.jsx";
import Button from "./components/ui/Button.jsx";
import CaseIntakeForm from "./components/cases/CaseIntakeForm.jsx";
import { Plus } from "lucide-react";
import AuthPage from "./pages/AuthPage.jsx";
import PasswordRecoveryPage from "./pages/PasswordRecoveryPage.jsx";
import CasesPage from "./pages/CasesPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DoctorsPage from "./pages/DoctorsPage.jsx";
const FinancePage = lazy(() => import("./pages/FinancePage.jsx"));
import HistoryPage from "./pages/HistoryPage.jsx";
import PwaStatus from "./pwa/PwaStatus.jsx";
import useApiAvailability from "./pwa/useApiAvailability.js";

import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { DataProvider, useData } from "./contexts/DataContext.jsx";

const THEME_STORAGE_KEY = "app-ui-theme";
const THEME_SEQUENCE = ["dark", "light"];

function getStoredTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_SEQUENCE.includes(storedTheme) ? storedTheme : "light";
}

function getNextTheme(currentTheme) {
  const currentIndex = THEME_SEQUENCE.indexOf(currentTheme);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % THEME_SEQUENCE.length;
  return THEME_SEQUENCE[nextIndex];
}

function AuthPageWrapper() {
  const auth = useAuth();
  return (
    <AuthPage
      authMode={auth.authMode}
      setAuthMode={auth.changeAuthMode}
      loginForm={auth.loginForm}
      registerForm={auth.registerForm}
      authLoading={auth.authLoading}
      authMessage={auth.authMessage}
      authErrors={auth.authErrors}
      onAuthChange={auth.handleAuthChange}
      onLogin={auth.handleLogin}
      onRegister={auth.handleRegister}
    />
  );
}

function HistoryPageWrapper({ data }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseId = searchParams.get("caseId");
  const { handleAuthExpired } = useAuth();

  return (
    <HistoryPage
      doctors={data.doctors}
      focusCaseId={caseId ? Number(caseId) : null}
      busy={data.busy}
      onStatusChanged={data.loadAppData}
      onMessage={data.setMessage}
      onAuthExpired={handleAuthExpired}
      onClearFocusCase={() => setSearchParams({})}
    />
  );
}

function AppContent({ theme, onToggleTheme }) {
  const { session, handleLogout } = useAuth();
  const data = useData();
  const { message, setMessage, confirmPending, setConfirmPending } = data;
  const location = useLocation();
  const navigate = useNavigate();
  const apiAvailability = useApiAvailability();

  // "dashboard" | "cases" | "history" | "doctors" | "finance"
  let activePage = "dashboard";
  if (location.pathname.startsWith("/cases")) activePage = "cases";
  else if (location.pathname.startsWith("/history")) activePage = "history";
  else if (location.pathname.startsWith("/doctors")) activePage = "doctors";
  else if (location.pathname.startsWith("/finance")) activePage = "finance";

  const relevantSnapshots =
    activePage === "finance"
      ? ["dashboard"]
      : activePage === "doctors"
        ? ["doctors"]
        : activePage === "history"
          ? []
          : ["cases", "doctors"];
  if (data.selectedCase && (activePage === "cases" || activePage === "dashboard")) {
    relevantSnapshots.push("items");
  }
  const stale = relevantSnapshots
    .map((type) => data.snapshotMeta[type])
    .filter((entry) => entry?.source === "snapshot")
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
  const readOnly = apiAvailability === "unavailable" || Boolean(stale);

  function handleNavigate(page, options = {}) {
    const nextPage = page === "dashboard" ? "/" : `/${page}`;
    if (page === "history" && options.caseId) {
      navigate(`${nextPage}?caseId=${options.caseId}`);
    } else {
      navigate(nextPage);
    }
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={handleNavigate}
      session={session}
      theme={theme}
      onToggleTheme={onToggleTheme}
      onLogout={handleLogout}
      message={message}
      onDismiss={() => setMessage(null)}
    >
      {stale && (
        <p
          role="status"
          className="border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-2 text-xs text-[var(--color-text-muted)]"
        >
          Último estado conhecido · atualizado em{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(stale.updatedAt))}
        </p>
      )}
      {readOnly && !stale && (
        <p
          role="status"
          className="border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-2 text-xs text-[var(--color-text-muted)]"
        >
          API indisponível · dados desta tela podem não estar disponíveis neste dispositivo.
        </p>
      )}
      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              cases={data.cases}
              doctors={data.doctors}
              loading={data.loading && !data.showCaseModal}
              busy={data.busy}
              selectedCase={data.dashboardDetailOpen ? data.selectedCase : null}
              items={data.items}
              itemForm={data.itemForm}
              onOpenNewCase={data.openNewCaseFromDashboard}
              onOpenNewCaseForDate={data.openNewCaseFromDashboardDate}
              onOpenCase={data.openCaseFromDashboard}
              onAdvanceCase={data.advanceCase}
              onDeliverCase={(caseId) => data.handleBulkDeliverCases([caseId])}
              onBulkDeliverCases={data.handleBulkDeliverCases}
              onRequestConfirm={data.requestConfirm}
              onItemChange={data.handleItemChange}
              onItemSubmit={data.handleItemSubmit}
              onRemoveItem={data.removeItem}
              onCloseDetails={data.closeDashboardCaseDetails}
              readOnly={readOnly}
              itemsUnavailable={data.itemsUnavailable}
            />
          }
        />
        <Route
          path="/cases"
          element={
            <CasesPage
              cases={data.cases}
              doctors={data.doctors}
              items={data.items}
              loading={data.loading}
              busy={data.busy}
              itemForm={data.itemForm}
              selectedCase={data.selectedCase}
              selectedDoctorId={data.selectedDoctorId}
              setSelectedDoctorId={data.setSelectedDoctorId}
              filterResetSignal={data.casesFilterResetSignal}
              onNewCase={data.openNewCaseModal}
              onItemChange={data.handleItemChange}
              onItemSubmit={data.handleItemSubmit}
              onOpenCaseItems={data.openCaseItems}
              onAdvanceCase={data.advanceCase}
              onBulkDeliverCases={data.handleBulkDeliverCases}
              onRemoveCase={data.removeCase}
              onRemoveItem={data.removeItem}
              onCloseDetails={() => data.setSelectedCaseId(null)}
              readOnly={readOnly}
              itemsUnavailable={data.itemsUnavailable}
            />
          }
        />
        <Route path="/history" element={<HistoryPageWrapper data={data} />} />
        <Route
          path="/doctors"
          element={
            <DoctorsPage
              doctors={data.doctors}
              loading={data.loading}
              busy={data.busy}
              doctorForm={data.doctorForm}
              editingDoctorId={data.editingDoctorId}
              showDoctorModal={data.showDoctorModal}
              setShowDoctorModal={data.setShowDoctorModal}
              onNewDoctor={data.openNewDoctorModal}
              onEditDoctor={data.openEditDoctorModal}
              onDoctorChange={data.handleDoctorChange}
              onDoctorSubmit={data.handleDoctorSubmit}
              onOpenDoctorCases={data.openDoctorCases}
              onRemoveDoctor={data.removeDoctor}
              readOnly={readOnly}
            />
          }
        />
        <Route
          path="/finance"
          element={
            <Suspense fallback={<p role="status">Carregando financeiro…</p>}>
              <FinancePage
                dashboard={data.dashboard}
                loading={data.dashboardLoading}
                error={data.dashboardError}
                onRetry={data.loadDashboard}
                onOpenHistory={() => handleNavigate("history")}
              />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {data.showCaseModal && (
        <Modal
          title="Novo caso"
          description="Identifique o trabalho, selecione os dentes e confira os valores."
          onClose={() => data.setShowCaseModal(false)}
          className="max-w-[1060px]"
        >
          {data.draftOffer && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm">
              <span className="flex-1">Há um rascunho local ainda não registrado.</span>
              <Button type="button" variant="outline" size="sm" onClick={data.restoreCaseDraft}>
                Restaurar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => data.setDraftOffer(false)}
              >
                Continuar em branco
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={data.discardCaseDraft}>
                Descartar
              </Button>
            </div>
          )}
          <CaseIntakeForm
            doctors={data.doctors}
            selectedDoctorId={data.selectedDoctorId}
            caseForm={data.caseForm}
            busy={data.busy}
            submitLabel="Salvar caso"
            submitIcon={Plus}
            onDoctorChange={data.setSelectedDoctorId}
            onCaseChange={data.handleCaseChange}
            onSubmit={data.handleCaseSubmit}
            readOnly={readOnly}
            onSaveDraft={data.saveCaseDraft}
          />
        </Modal>
      )}

      {confirmPending && (
        <ConfirmModal
          title={confirmPending.title}
          description={confirmPending.description}
          confirmLabel={confirmPending.confirmLabel}
          onConfirm={() => {
            confirmPending.onConfirm();
            setConfirmPending(null);
          }}
          onCancel={() => setConfirmPending(null)}
        />
      )}
    </AppLayout>
  );
}

function Root() {
  const { session } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState(() => getStoredTheme());

  // Auth and the workspace share the same explicit preference; never use the OS theme.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = getNextTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  if (location.pathname === "/reset-password") return <PasswordRecoveryPage key="reset" reset />;
  if (location.pathname === "/forgot-password") return <PasswordRecoveryPage key="forgot" />;

  if (!session) {
    return <AuthPageWrapper />;
  }

  return (
    <DataProvider>
      <AppContent theme={theme} onToggleTheme={toggleTheme} />
    </DataProvider>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Root />
        <PwaStatus />
      </AuthProvider>
    </Router>
  );
}
