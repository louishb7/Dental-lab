import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  createCase,
  createCaseItem,
  createCaseItemsBulk,
  createDoctor,
  bulkDeliverCases,
  deleteCase,
  deleteCaseItem,
  deleteDoctor,
  getCaseItems,
  getCases,
  getDashboardOverview,
  getDoctors,
  updateCaseItem,
  updateCase,
  updateDoctor,
} from "../services/api.js";
import {
  buildAutomaticCaseItems,
  buildCasePayload,
  buildDentalWorkItems,
  buildDoctorPayload,
  buildItemPayload,
  EMPTY_CASE,
  EMPTY_DOCTOR,
  EMPTY_ITEM,
  formatBrazilianPhone,
} from "../utils/forms.js";
import { formatCurrencyInput, getLocalDateKey } from "../utils/formatters.js";
import { useNavigate } from "react-router-dom";

const DataContext = createContext(null);

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

const LAST_CASE_DOCTOR_STORAGE_KEY = "cadisk_last_case_doctor_id";

function getSuggestedCaseDeadline() {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 1);

  const year = deadline.getFullYear();
  const month = String(deadline.getMonth() + 1).padStart(2, "0");
  const day = String(deadline.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDefaultCaseForm(overrides = {}) {
  return {
    ...EMPTY_CASE,
    deadline: getSuggestedCaseDeadline(),
    ...overrides,
  };
}

export function DataProvider({ children }) {
  const { session, handleAuthExpired } = useAuth();
  const navigate = useNavigate();
  
  const [dashboard, setDashboard] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [cases, setCases] = useState([]);
  const [items, setItems] = useState([]);
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR);
  const [caseForm, setCaseForm] = useState(EMPTY_CASE);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [dashboardDetailOpen, setDashboardDetailOpen] = useState(false);
  const [casesFilterResetSignal, setCasesFilterResetSignal] = useState(0);
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
    if (session) {
      loadAppData();
    }
  }, [session]);

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
      handleAuthExpired();
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

  async function revealCaseInCases(caseId) {
    navigate("/cases");
    setSelectedCaseId(caseId);
    setSelectedDoctorId(null);
    setCasesFilterResetSignal((current) => current + 1);
    return loadAppData({ selectedCaseId: caseId });
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
      const payload = buildCasePayload(selectedDoctorId, caseForm);
      if (automaticItems.length) {
        payload.items = automaticItems;
      }
      const createdCase = await createCase(payload);
      window.localStorage.setItem(LAST_CASE_DOCTOR_STORAGE_KEY, String(selectedDoctorId));

      const refreshed = await revealCaseInCases(createdCase.id);
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
        await createCaseItemsBulk(selectedCaseId, payloads);
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
    navigate("/cases");
  }

  function getDefaultCaseDoctorId() {
    const storedDoctorId = Number(window.localStorage.getItem(LAST_CASE_DOCTOR_STORAGE_KEY));

    if (storedDoctorId && doctors.some((doctor) => doctor.id === storedDoctorId)) {
      return storedDoctorId;
    }

    return doctors.length === 1 ? doctors[0].id : null;
  }

  function openNewCaseModal(defaults = {}) {
    setCaseForm(createDefaultCaseForm(defaults));
    setSelectedDoctorId(getDefaultCaseDoctorId());
    setShowCaseModal(true);
  }

  function openNewCaseFromDashboard() {
    navigate("/cases");
    openNewCaseModal();
  }

  function openNewCaseFromDashboardDate(date) {
    navigate("/cases");
    openNewCaseModal({ deadline: getLocalDateKey(date) || getSuggestedCaseDeadline() });
  }

  async function openCaseFromDashboard(caseId) {
    setDashboardDetailOpen(true);
    await openCaseItems(caseId);
  }

  function closeDashboardCaseDetails() {
    setDashboardDetailOpen(false);
    setSelectedCaseId(null);
    setItems([]);
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

  const value = {
    dashboard,
    doctors,
    cases,
    items,
    doctorForm,
    caseForm,
    itemForm,
    selectedDoctorId,
    setSelectedDoctorId,
    selectedCaseId,
    setSelectedCaseId,
    dashboardDetailOpen,
    setDashboardDetailOpen,
    casesFilterResetSignal,
    setCasesFilterResetSignal,
    showDoctorModal,
    setShowDoctorModal,
    showCaseModal,
    setShowCaseModal,
    editingDoctorId,
    loading,
    busy,
    message,
    setMessage,
    confirmPending,
    setConfirmPending,
    selectedCase,
    loadAppData,
    requestConfirm,
    handleDoctorChange,
    handleCaseChange,
    handleItemChange,
    handleDoctorSubmit,
    openNewDoctorModal,
    openEditDoctorModal,
    handleCaseSubmit,
    handleItemSubmit,
    handleBulkDeliverCases,
    openCaseItems,
    openDoctorCases,
    openNewCaseModal,
    openNewCaseFromDashboard,
    openNewCaseFromDashboardDate,
    openCaseFromDashboard,
    closeDashboardCaseDetails,
    advanceCase,
    removeDoctor,
    removeCase,
    removeItem,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
