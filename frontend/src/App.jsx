import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import ConfirmModal from "./components/ui/ConfirmModal.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import CasesPage from "./pages/CasesPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DoctorsPage from "./pages/DoctorsPage.jsx";
import FinancePage from "./pages/FinancePage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";

import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { DataProvider, useData } from "./contexts/DataContext.jsx";

const THEME_STORAGE_KEY = "app-ui-theme";
const THEME_SEQUENCE = ["dark", "light"];

function getStoredTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_SEQUENCE.includes(storedTheme) ? storedTheme : "dark";
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
  const caseId = searchParams.get('caseId');
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

function AppContent() {
  const { session, handleLogout } = useAuth();
  const data = useData();
  const {
    message,
    setMessage,
    confirmPending,
    setConfirmPending
  } = data;
  const [theme, setTheme] = useState(() => getStoredTheme());
  const location = useLocation();
  const navigate = useNavigate();

  // "dashboard" | "cases" | "history" | "doctors" | "finance"
  let activePage = "dashboard";
  if (location.pathname.startsWith("/cases")) activePage = "cases";
  else if (location.pathname.startsWith("/history")) activePage = "history";
  else if (location.pathname.startsWith("/doctors")) activePage = "doctors";
  else if (location.pathname.startsWith("/finance")) activePage = "finance";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => getNextTheme(current));
  }

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
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
      message={message}
      onDismiss={() => setMessage(null)}
    >
      <Routes>
        <Route path="/" element={
          <DashboardPage
            cases={data.cases}
            doctors={data.doctors}
            loading={data.loading}
            busy={data.busy}
            selectedCase={data.dashboardDetailOpen ? data.selectedCase : null}
            items={data.items}
            itemForm={data.itemForm}
            onOpenNewCase={data.openNewCaseFromDashboard}
            onOpenNewCaseForDate={data.openNewCaseFromDashboardDate}
            onOpenCase={data.openCaseFromDashboard}
            onAdvanceCase={data.advanceCase}
            onDeliverCase={(caseId) => data.handleBulkDeliverCases([caseId])}
            onItemChange={data.handleItemChange}
            onItemSubmit={data.handleItemSubmit}
            onRemoveItem={data.removeItem}
            onCloseDetails={data.closeDashboardCaseDetails}
          />
        } />
        <Route path="/cases" element={
          <CasesPage
            cases={data.cases}
            doctors={data.doctors}
            items={data.items}
            loading={data.loading}
            busy={data.busy}
            caseForm={data.caseForm}
            itemForm={data.itemForm}
            selectedCase={data.selectedCase}
            showCaseModal={data.showCaseModal}
            setShowCaseModal={data.setShowCaseModal}
            selectedDoctorId={data.selectedDoctorId}
            setSelectedDoctorId={data.setSelectedDoctorId}
            filterResetSignal={data.casesFilterResetSignal}
            onNewCase={data.openNewCaseModal}
            onCaseChange={data.handleCaseChange}
            onCaseSubmit={data.handleCaseSubmit}
            onItemChange={data.handleItemChange}
            onItemSubmit={data.handleItemSubmit}
            onOpenCaseItems={data.openCaseItems}
            onAdvanceCase={data.advanceCase}
            onBulkDeliverCases={data.handleBulkDeliverCases}
            onRemoveCase={data.removeCase}
            onRemoveItem={data.removeItem}
            onCloseDetails={() => data.setSelectedCaseId(null)}
          />
        } />
        <Route path="/history" element={
          <HistoryPageWrapper data={data} />
        } />
        <Route path="/doctors" element={
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
          />
        } />
        <Route path="/finance" element={
          <FinancePage
            dashboard={data.dashboard}
            loading={data.loading}
            onOpenHistory={() => handleNavigate("history")}
          />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
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
  
  if (!session) {
    return <AuthPageWrapper />;
  }

  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </Router>
  );
}
