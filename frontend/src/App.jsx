import { useEffect, useMemo, useState } from "react";
import AppLayout from "./components/layout/AppLayout.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import CasesPage from "./pages/CasesPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DoctorsPage from "./pages/DoctorsPage.jsx";
import {
  clearSession,
  createCase,
  createCaseItem,
  createDoctor,
  deleteCase,
  deleteCaseItem,
  deleteDoctor,
  getCaseItems,
  getCases,
  getCurrentUser,
  getDashboardOverview,
  getDoctors,
  getStoredSession,
  login,
  register,
  updateCase,
} from "./services/api.js";
import {
  buildCasePayload,
  buildDoctorPayload,
  buildItemPayload,
  EMPTY_CASE,
  EMPTY_DOCTOR,
  EMPTY_ITEM,
  EMPTY_LOGIN,
  EMPTY_REGISTER,
  formatBrazilianPhone,
} from "./utils/forms.js";

export default function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);

  const [activePage, setActivePage] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [cases, setCases] = useState([]);
  const [items, setItems] = useState([]);
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR);
  const [caseForm, setCaseForm] = useState(EMPTY_CASE);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [caseAdvanced, setCaseAdvanced] = useState(false);
  const [itemAdvanced, setItemAdvanced] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [loading, setLoading] = useState(Boolean(session));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedCase = useMemo(
    () => cases.find((caseItem) => caseItem.id === selectedCaseId) || null,
    [cases, selectedCaseId],
  );

  async function loadAppData() {
    setLoading(true);
    setMessage(null);
    try {
      const [doctorData, caseData, dashboardData] = await Promise.all([
        getDoctors(),
        getCases(),
        getDashboardOverview(),
      ]);
      setDoctors(Array.isArray(doctorData) ? doctorData : []);
      setCases(Array.isArray(caseData) ? caseData : []);
      setDashboard(dashboardData);
    } catch (error) {
      clearSession();
      setSession(null);
      setAuthMessage({
        type: "error",
        text: "Sessão expirada ou API indisponível. Faça login novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAuthChange(event, mode) {
    const { name, value } = event.target;
    const setter = mode === "login" ? setLoginForm : setRegisterForm;
    setter((current) => ({ ...current, [name]: value }));
  }

  function handleDoctorChange(event) {
    const { name, value } = event.target;
    setDoctorForm((current) => ({
      ...current,
      [name]: name === "phone" ? formatBrazilianPhone(value) : value,
    }));
  }

  function handleCaseChange(event) {
    const { name, value } = event.target;
    setCaseForm((current) => ({ ...current, [name]: value }));
  }

  function handleItemChange(event) {
    const { name, value } = event.target;
    setItemForm((current) => ({ ...current, [name]: value }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const user = await login({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      setSession(user);
      setLoginForm(EMPTY_LOGIN);
    } catch (error) {
      setAuthMessage({ type: "error", text: error.message });
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const user = await register({
        email: registerForm.email.trim(),
        username: registerForm.username.trim(),
        password: registerForm.password,
      });
      setSession(user);
      setRegisterForm(EMPTY_REGISTER);
    } catch (error) {
      setAuthMessage({ type: "error", text: error.message });
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setDoctors([]);
    setCases([]);
    setItems([]);
    setDashboard(null);
    setSelectedCaseId(null);
  }

  async function handleDoctorSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const created = await createDoctor(buildDoctorPayload(doctorForm));
      setDoctors((current) => [created, ...current]);
      setDoctorForm(EMPTY_DOCTOR);
      setShowDoctorModal(false);
      setMessage({ type: "success", text: "Dentista cadastrado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleCaseSubmit(event) {
    event.preventDefault();
    if (!selectedDoctorId) return;

    setBusy(true);
    setMessage(null);
    try {
      const created = await createCase(buildCasePayload(selectedDoctorId, caseForm, true));
      setCases((current) => [created, ...current]);
      setCaseForm(EMPTY_CASE);
      setShowCaseModal(false);
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Caso criado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    if (!selectedCaseId) return;

    setBusy(true);
    setMessage(null);
    try {
      const created = await createCaseItem(
        selectedCaseId,
        buildItemPayload(itemForm, itemAdvanced),
      );
      setItems((current) => [created, ...current]);
      setItemForm(EMPTY_ITEM);
      setCases(await getCases());
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Item/serviço criado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function openCaseItems(caseId) {
    setBusy(true);
    setMessage(null);
    try {
      const data = await getCaseItems(caseId);
      setSelectedCaseId(caseId);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function openDoctorCases(doctorId) {
    setSelectedDoctorId(doctorId);
    setActivePage("cases");
  }

  async function advanceCase(caseItem) {
    const nextStatus = caseItem.status === "pending" ? "completed" : "delivered";
    setBusy(true);
    setMessage(null);
    try {
      const updated = await updateCase(caseItem.id, { status: nextStatus });
      setCases((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Status do caso atualizado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeDoctor(doctorId) {
    if (!window.confirm("Excluir este dentista?")) return;

    setBusy(true);
    setMessage(null);
    try {
      await deleteDoctor(doctorId);
      setDoctors((current) => current.filter((doctor) => doctor.id !== doctorId));
      if (selectedDoctorId === doctorId) setSelectedDoctorId(null);
      setMessage({ type: "success", text: "Dentista removido." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeCase(caseId) {
    if (!window.confirm("Excluir este caso?")) return;

    setBusy(true);
    setMessage(null);
    try {
      await deleteCase(caseId);
      setCases((current) => current.filter((caseItem) => caseItem.id !== caseId));
      if (selectedCaseId === caseId) {
        setSelectedCaseId(null);
        setItems([]);
      }
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Caso removido." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId) {
    if (!selectedCaseId || !window.confirm("Excluir este item?")) return;

    setBusy(true);
    setMessage(null);
    try {
      await deleteCaseItem(selectedCaseId, itemId);
      setItems((current) => current.filter((item) => item.id !== itemId));
      setCases(await getCases());
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Item/serviço removido." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!session) return;

    getCurrentUser()
      .then((user) => {
        setSession({ username: user.username, email: user.email });
        return loadAppData();
      })
      .catch(() => {
        clearSession();
        setSession(null);
        setLoading(false);
        setAuthMessage({ type: "error", text: "Sessão expirada. Faça login novamente." });
      });
  }, [session?.username]);

  if (!session) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        loginForm={loginForm}
        registerForm={registerForm}
        authLoading={authLoading}
        authMessage={authMessage}
        onAuthChange={handleAuthChange}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      session={session}
      onRefresh={loadAppData}
      onLogout={handleLogout}
    >
      {activePage === "dashboard" && <DashboardPage dashboard={dashboard} loading={loading} />}

      {activePage === "cases" && (
        <CasesPage
          cases={cases}
          doctors={doctors}
          items={items}
          loading={loading}
          busy={busy}
          message={message}
          caseForm={caseForm}
          itemForm={itemForm}
          caseAdvanced={caseAdvanced}
          itemAdvanced={itemAdvanced}
          selectedCase={selectedCase}
          showCaseModal={showCaseModal}
          setShowCaseModal={setShowCaseModal}
          setCaseAdvanced={setCaseAdvanced}
          setItemAdvanced={setItemAdvanced}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          onCaseChange={handleCaseChange}
          onCaseSubmit={handleCaseSubmit}
          onItemChange={handleItemChange}
          onItemSubmit={handleItemSubmit}
          onOpenCaseItems={openCaseItems}
          onAdvanceCase={advanceCase}
          onRemoveCase={removeCase}
          onRemoveItem={removeItem}
          onCloseDetails={() => setSelectedCaseId(null)}
        />
      )}

      {activePage === "doctors" && (
        <DoctorsPage
          doctors={doctors}
          loading={loading}
          busy={busy}
          message={message}
          doctorForm={doctorForm}
          showDoctorModal={showDoctorModal}
          setShowDoctorModal={setShowDoctorModal}
          onDoctorChange={handleDoctorChange}
          onDoctorSubmit={handleDoctorSubmit}
          onOpenDoctorCases={openDoctorCases}
          onRemoveDoctor={removeDoctor}
        />
      )}
    </AppLayout>
  );
}

