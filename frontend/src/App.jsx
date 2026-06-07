import { useEffect, useMemo, useState } from "react";
import AppLayout from "./components/layout/AppLayout.jsx";
import ConfirmModal from "./components/ui/ConfirmModal.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import CasesPage from "./pages/CasesPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DoctorsPage from "./pages/DoctorsPage.jsx";
import FinancePage from "./pages/FinancePage.jsx";
import {
  clearSession,
  createCase,
  createCaseItem,
  createDoctor,
  bulkDeliverCases,
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
  updateCaseItem,
  updateCase,
  updateDoctor,
} from "./services/api.js";
import {
  buildAutomaticCaseItems,
  buildCasePayload,
  buildDentalWorkItems,
  buildDoctorPayload,
  buildItemPayload,
  EMPTY_CASE,
  EMPTY_DOCTOR,
  EMPTY_ITEM,
  EMPTY_LOGIN,
  EMPTY_REGISTER,
  formatBrazilianPhone,
} from "./utils/forms.js";
import { formatCurrencyInput } from "./utils/formatters.js";

const THEME_STORAGE_KEY = "app-ui-theme";

function getStoredTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" ? "light" : "dark";
}

function createEmptyAuthErrors() {
  return {
    identifier: "",
    email: "",
    username: "",
    password: "",
    general: "",
  };
}

function normalizeValidationMessage(message) {
  return message.replace(/^Value error,\s*/, "");
}

function buildAuthErrors(details) {
  const errors = createEmptyAuthErrors();

  for (const item of details) {
    const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
    const message = normalizeValidationMessage(String(item?.msg || "Campo inválido"));

    if (field && Object.prototype.hasOwnProperty.call(errors, field)) {
      errors[field] = message;
    } else {
      errors.general = errors.general || message;
    }
  }

  return errors;
}

export default function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);
  const [authErrors, setAuthErrors] = useState(createEmptyAuthErrors());

  const [activePage, setActivePage] = useState("dashboard");
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [dashboard, setDashboard] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [cases, setCases] = useState([]);
  const [items, setItems] = useState([]);
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR);
  const [caseForm, setCaseForm] = useState(EMPTY_CASE);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmPending, setConfirmPending] = useState(null);

  const selectedCase = useMemo(
    () => cases.find((caseItem) => caseItem.id === selectedCaseId) || null,
    [cases, selectedCaseId],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function changeAuthMode(mode) {
    setAuthMode(mode);
    setAuthMessage(null);
    setAuthErrors(createEmptyAuthErrors());
  }

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  async function loadAppData(options = {}) {
    const selectedCaseIdSnapshot = Object.prototype.hasOwnProperty.call(options, "selectedCaseId")
      ? options.selectedCaseId
      : selectedCaseId;

    setLoading(true);
    setMessage(null);
    try {
      const [doctorData, caseData, dashboardData] = await Promise.all([
        getDoctors(),
        getCases(),
        getDashboardOverview(),
      ]);
      const doctorList = Array.isArray(doctorData) ? doctorData : [];
      const caseList = Array.isArray(caseData) ? caseData : [];

      setDoctors(doctorList);
      setCases(caseList);
      setDashboard(dashboardData);

      if (selectedCaseIdSnapshot && caseList.some((caseItem) => caseItem.id === selectedCaseIdSnapshot)) {
        try {
          const itemData = await getCaseItems(selectedCaseIdSnapshot);
          setItems(Array.isArray(itemData) ? itemData : []);
        } catch {
          setItems([]);
        }
      } else {
        setItems([]);
      }

      return true;
    } catch (error) {
      clearSession();
      setSession(null);
      setAuthMessage({
        type: "error",
        text: "Sessão expirada ou API indisponível. Faça login novamente.",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }

  function requestConfirm({ title, description, confirmLabel, action }) {
    setConfirmPending({
      title,
      description,
      confirmLabel,
      onConfirm: action,
    });
  }

  function handleAuthChange(event, mode) {
    const { name, value } = event.target;
    const setter = mode === "login" ? setLoginForm : setRegisterForm;
    setter((current) => ({ ...current, [name]: value }));
    setAuthErrors((current) => ({ ...current, [name]: "" }));
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
    setCaseForm((current) => ({
      ...current,
      [name]: name === "total_value" ? formatCurrencyInput(value) : value,
    }));
  }

  function handleItemChange(event) {
    const { name, value } = event.target;
    setItemForm((current) => ({
      ...current,
      [name]: name === "unit_value" ? formatCurrencyInput(value) : value,
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    setAuthErrors(createEmptyAuthErrors());
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
    setAuthErrors(createEmptyAuthErrors());
    try {
      const user = await register({
        email: registerForm.email.trim(),
        username: registerForm.username.trim(),
        password: registerForm.password,
      });
      setSession(user);
      setRegisterForm(EMPTY_REGISTER);
    } catch (error) {
      if (error.status === 422 && Array.isArray(error.details)) {
        setAuthErrors(buildAuthErrors(error.details));
        setAuthMessage({
          type: "error",
          text: "Corrija os campos destacados para continuar.",
        });
      } else {
        setAuthMessage({ type: "error", text: error.message });
      }
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
    setMessage(null);
    setConfirmPending(null);
    setAuthMessage(null);
  }

  async function handleDoctorSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const isEditing = Boolean(editingDoctorId);
      if (editingDoctorId) {
        await updateDoctor(editingDoctorId, buildDoctorPayload(doctorForm));
      } else {
        await createDoctor(buildDoctorPayload(doctorForm));
      }
      const refreshed = await loadAppData();
      if (!refreshed) return;
      setDoctorForm(EMPTY_DOCTOR);
      setShowDoctorModal(false);
      setEditingDoctorId(null);
      setMessage({ type: "success", text: isEditing ? "Dentista atualizado." : "Dentista cadastrado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function openNewDoctorModal() {
    setEditingDoctorId(null);
    setDoctorForm(EMPTY_DOCTOR);
    setShowDoctorModal(true);
  }

  function openEditDoctorModal(doctor) {
    setEditingDoctorId(doctor.id);
    setDoctorForm({
      name: doctor.name || "",
      clinic_name: doctor.clinic_name || "",
      phone: doctor.phone || "",
      notes: doctor.notes || "",
    });
    setShowDoctorModal(true);
  }

  async function handleCaseSubmit(event) {
    event.preventDefault();
    if (!selectedDoctorId) return;

    const automaticItems = caseForm.pricing_mode === "services" ? buildAutomaticCaseItems(caseForm) : [];

    if (automaticItems.some((item) => item.unit_value === null)) {
      setMessage({ type: "error", text: "Preencha o valor de cada dente selecionado antes de criar o caso." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const createdCase = await createCase(buildCasePayload(selectedDoctorId, caseForm));

      if (automaticItems.length) {
        try {
          await Promise.all(automaticItems.map((item) => createCaseItem(createdCase.id, item)));
        } catch (error) {
          const refreshed = await loadAppData();
          if (!refreshed) return;
          setCaseForm(EMPTY_CASE);
          setShowCaseModal(false);
          setMessage({
            type: "error",
            text: `Caso criado, mas houve falha ao lançar os dentes automaticamente: ${error.message}`,
          });
          return;
        }
      }

      const refreshed = await loadAppData();
      if (!refreshed) return;
      setCaseForm(EMPTY_CASE);
      setShowCaseModal(false);
      setMessage({
        type: "success",
        text: automaticItems.length
          ? `Caso criado com ${automaticItems.length} ${
              automaticItems.length === 1 ? "item de serviço automático" : "itens de serviço automáticos"
            }.`
          : "Caso criado.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleItemSubmit(event, options = {}) {
    event.preventDefault();
    if (!selectedCaseId) return false;

    const selectedTeeth = Array.isArray(itemForm.selected_teeth) ? itemForm.selected_teeth : [];
    if (!options.itemId && !selectedTeeth.length) {
      setMessage({ type: "error", text: "Selecione ao menos um dente antes de adicionar o serviço." });
      return false;
    }

    setBusy(true);
    setMessage(null);
    try {
      if (options.itemId) {
        const payload = buildItemPayload(
          itemForm,
          selectedCase?.pricing_mode,
        );
        await updateCaseItem(selectedCaseId, options.itemId, payload);
      } else if (selectedTeeth.length) {
        const itemPricingMode = options.pricingMode || selectedCase?.pricing_mode;
        const payloads = buildDentalWorkItems(itemForm, itemPricingMode);
        if (payloads.some((payload) => payload.unit_value === null && itemPricingMode !== "fixed")) {
          setMessage({ type: "error", text: "Preencha o valor de cada dente selecionado antes de adicionar o serviço." });
          return false;
        }
        await Promise.all(payloads.map((payload) => createCaseItem(selectedCaseId, payload)));
      } else {
        const payload = buildItemPayload(
          itemForm,
          selectedCase?.pricing_mode,
        );
        await createCaseItem(selectedCaseId, payload);
      }
      const refreshed = await loadAppData();
      if (!refreshed) return false;
      setItemForm(EMPTY_ITEM);
      setMessage({
        type: "success",
        text: options.itemId ? "Serviço atualizado." : "Serviço criado.",
      });
      return true;
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkDeliverCases(caseIds) {
    if (!caseIds.length) return false;

    setBusy(true);
    setMessage(null);
    try {
      const deliveredCases = await bulkDeliverCases({ case_ids: caseIds });
      const deliveredIds = new Set(deliveredCases.map((caseItem) => caseItem.id));
      const shouldClearSelection = selectedCaseId && deliveredIds.has(selectedCaseId);

      const refreshed = await loadAppData({
        selectedCaseId: shouldClearSelection ? null : selectedCaseId,
      });
      if (!refreshed) return false;
      if (shouldClearSelection) {
        setSelectedCaseId(null);
        setItems([]);
      }
      setMessage({
        type: "success",
        text: `${deliveredCases.length} ${deliveredCases.length === 1 ? "caso entregue" : "casos entregues"}.`,
      });
      return true;
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      return false;
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

  function openNewCaseFromDashboard() {
    setCaseForm(EMPTY_CASE);
    setSelectedDoctorId(null);
    setActivePage("cases");
    setShowCaseModal(true);
  }

  async function openCaseFromDashboard(caseId) {
    setActivePage("cases");
    await openCaseItems(caseId);
  }

  async function commitCaseStatus(caseItem, nextStatus) {
    setBusy(true);
    setMessage(null);
    try {
      await updateCase(caseItem.id, { status: nextStatus });
      const refreshed = await loadAppData();
      if (!refreshed) return;
      setMessage({ type: "success", text: "Status do caso atualizado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function advanceCase(caseItem) {
    if (caseItem.status !== "pending") return;

    await commitCaseStatus(caseItem, "completed");
  }

  async function commitDoctorRemoval(doctorId) {
    setBusy(true);
    setMessage(null);
    try {
      await deleteDoctor(doctorId);
      const shouldClearDoctor = selectedDoctorId === doctorId;
      if (shouldClearDoctor) setSelectedDoctorId(null);
      const refreshed = await loadAppData();
      if (!refreshed) return;
      setMessage({ type: "success", text: "Dentista removido." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function removeDoctor(doctorId) {
    requestConfirm({
      title: "Excluir dentista",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      action: () => {
        void commitDoctorRemoval(doctorId);
      },
    });
  }

  async function commitCaseRemoval(caseId) {
    setBusy(true);
    setMessage(null);
    try {
      await deleteCase(caseId);
      const selectedRemoved = selectedCaseId === caseId;
      if (selectedCaseId === caseId) {
        setSelectedCaseId(null);
        setItems([]);
      }
      const refreshed = await loadAppData({ selectedCaseId: selectedRemoved ? null : selectedCaseId });
      if (!refreshed) return;
      setMessage({ type: "success", text: "Caso removido." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function removeCase(caseId) {
    requestConfirm({
      title: "Excluir caso",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      action: () => {
        void commitCaseRemoval(caseId);
      },
    });
  }

  async function commitItemRemoval(itemId) {
    setBusy(true);
    setMessage(null);
    try {
      await deleteCaseItem(selectedCaseId, itemId);
      const refreshed = await loadAppData();
      if (!refreshed) return;
      setMessage({ type: "success", text: "Serviço removido." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function removeItem(itemId) {
    if (!selectedCaseId) return;

    requestConfirm({
      title: "Excluir item de serviço",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      action: () => {
        void commitItemRemoval(itemId);
      },
    });
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
        setAuthMode={changeAuthMode}
        loginForm={loginForm}
        registerForm={registerForm}
        authLoading={authLoading}
        authMessage={authMessage}
        authErrors={authErrors}
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
      theme={theme}
      onToggleTheme={toggleTheme}
      onRefresh={loadAppData}
      onLogout={handleLogout}
      message={message}
      onDismiss={() => setMessage(null)}
    >
      {activePage === "dashboard" && (
        <DashboardPage
          dashboard={dashboard}
          cases={cases}
          doctors={doctors}
          loading={loading}
          onOpenNewCase={openNewCaseFromDashboard}
          onOpenCase={openCaseFromDashboard}
          onDeliverCases={handleBulkDeliverCases}
          onRemoveCase={removeCase}
        />
      )}

      {activePage === "cases" && (
        <CasesPage
          cases={cases}
          doctors={doctors}
          items={items}
          loading={loading}
          busy={busy}
          caseForm={caseForm}
          itemForm={itemForm}
          selectedCase={selectedCase}
          showCaseModal={showCaseModal}
          setShowCaseModal={setShowCaseModal}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          onCaseChange={handleCaseChange}
          onCaseSubmit={handleCaseSubmit}
          onItemChange={handleItemChange}
          onItemSubmit={handleItemSubmit}
          onOpenCaseItems={openCaseItems}
          onAdvanceCase={advanceCase}
          onBulkDeliverCases={handleBulkDeliverCases}
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
          doctorForm={doctorForm}
          editingDoctorId={editingDoctorId}
          showDoctorModal={showDoctorModal}
          setShowDoctorModal={setShowDoctorModal}
          onNewDoctor={openNewDoctorModal}
          onEditDoctor={openEditDoctorModal}
          onDoctorChange={handleDoctorChange}
          onDoctorSubmit={handleDoctorSubmit}
          onOpenDoctorCases={openDoctorCases}
          onRemoveDoctor={removeDoctor}
        />
      )}

      {activePage === "finance" && <FinancePage dashboard={dashboard} cases={cases} loading={loading} />}

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
