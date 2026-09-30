import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  getStoredSession,
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
import { getApiAvailability, subscribeApiAvailability } from "../services/api.js";
import {
  deleteOfflineRecord,
  readOfflineRecord,
  readPendingCases,
  saveOfflineRecord,
} from "../pwa/offlineStore.js";

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

function validCollection(type, data) {
  if (!Array.isArray(data)) return false;
  if (type === "doctors")
    return data.every((item) => Number.isSafeInteger(item?.id) && typeof item.name === "string");
  if (type === "cases")
    return data.every(
      (item) =>
        Number.isSafeInteger(item?.id) &&
        (item.doctor_id === null || Number.isSafeInteger(item.doctor_id)) &&
        typeof item.patient_ref === "string" &&
        typeof item.status === "string",
    );
  if (type === "items")
    return data.every(
      (item) => Number.isSafeInteger(item?.id) && typeof item.service_type === "string",
    );
  return false;
}

export function DataProvider({ children }) {
  const { session, handleAuthExpired, handleLogout, revalidateSession } = useAuth();
  const navigate = useNavigate();
  const sessionUsername = session?.username;
  const userId = session?.id;

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(Boolean(session));
  const [dashboardError, setDashboardError] = useState(null);
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
  const [snapshotMeta, setSnapshotMeta] = useState({});
  const [itemsUnavailable, setItemsUnavailable] = useState(false);
  const [draft, setDraft] = useState(null);
  const [draftOffer, setDraftOffer] = useState(false);
  const [draftInForm, setDraftInForm] = useState(false);
  const [pendingCases, setPendingCases] = useState([]);
  const [pendingReviewId, setPendingReviewId] = useState(null);
  const [syncingCaseId, setSyncingCaseId] = useState(null);
  const casesRef = useRef([]);
  const caseMutationVersionRef = useRef(0);
  const syncPromiseRef = useRef(null);
  const activeCreateIdsRef = useRef(new Set());

  const selectedCase = useMemo(
    () => cases.find((caseItem) => caseItem.id === selectedCaseId) || null,
    [cases, selectedCaseId],
  );

  useEffect(() => {
    if (sessionUsername) {
      void loadAppData().then(() => syncPendingCases());
    }
  }, [sessionUsername, userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    readPendingCases(userId)
      .then((records) => {
        if (active) {
          setPendingCases(records);
          void syncPendingCases();
        }
      })
      .catch(() => {
        if (active)
          setMessage({ type: "error", text: "Casos locais indisponíveis neste dispositivo." });
      });
    readOfflineRecord(userId, "draft")
      .then((record) => {
        if (active) setDraft(record);
      })
      .catch(() => {
        if (active)
          setMessage({ type: "error", text: "Rascunho local indisponível neste dispositivo." });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeApiAvailability((next, previous, reason) => {
      if (previous === "unavailable" && next === "available" && reason !== "auth") {
        void loadAppData().then(() => syncPendingCases());
      }
    });
  }, [userId]);

  function setSource(type, source, updatedAt = null) {
    setSnapshotMeta((current) => ({ ...current, [type]: { source, updatedAt } }));
  }

  async function loadCollection(type, request, setter) {
    const requestToken = window.localStorage.getItem("cadisk_token");
    const caseVersion = caseMutationVersionRef.current;
    try {
      const data = await request();
      if (!validCollection(type, data)) throw new Error("Resposta inválida da API.");
      if (type === "cases" && caseVersion !== caseMutationVersionRef.current) return true;
      setter(data);
      setSource(type, "live", new Date().toISOString());
      if (userId && getStoredSession()?.id === userId) {
        await saveOfflineRecord(userId, type, data).catch(() => {
          setMessage({
            type: "error",
            text: "Não foi possível guardar os dados para consulta offline.",
          });
        });
      }
      return true;
    } catch (error) {
      if (error.status === 401 && window.localStorage.getItem("cadisk_token") === requestToken) {
        handleAuthExpired();
        return false;
      }
      if (type === "cases" && caseVersion !== caseMutationVersionRef.current) return false;
      const record = userId ? await readOfflineRecord(userId, type).catch(() => null) : null;
      if (type === "cases" && caseVersion !== caseMutationVersionRef.current) return false;
      setter(record?.data || []);
      setSource(type, record ? "snapshot" : "unavailable", record?.updatedAt);
      return false;
    }
  }

  async function loadAppData(options = {}) {
    const selectedCaseIdSnapshot = Object.prototype.hasOwnProperty.call(options, "selectedCaseId")
      ? options.selectedCaseId
      : selectedCaseId;

    setLoading(true);
    setMessage(null);
    void loadDashboard();
    try {
      const [doctorsCurrent, casesCurrent] = await Promise.all([
        loadCollection("doctors", getDoctors, setDoctors),
        loadCollection("cases", getCases, replaceCases),
      ]);

      if (selectedCaseIdSnapshot) {
        await loadCaseItems(selectedCaseIdSnapshot);
      } else {
        setItems([]);
        setItemsUnavailable(false);
      }

      return doctorsCurrent && casesCurrent;
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      return false;
    } finally {
      setLoading(false);
    }
  }

  function replaceCases(next) {
    casesRef.current = next;
    setCases(next);
  }

  function applyOfficialCases(confirmed) {
    caseMutationVersionRef.current += 1;
    const updatedIds = new Set(confirmed.map((item) => item.id));
    const next = [...confirmed, ...casesRef.current.filter((item) => !updatedIds.has(item.id))];
    replaceCases(next);
    setSource("cases", "live", new Date().toISOString());
    if (userId && getStoredSession()?.id === userId) {
      void saveOfflineRecord(userId, "cases", next).catch(() => {
        setMessage({
          type: "error",
          text: "Não foi possível atualizar a consulta offline de casos.",
        });
      });
    }
  }

  function refreshSecondaryData() {
    void loadDashboard();
    void loadCollection("doctors", getDoctors, setDoctors);
  }

  function closeCaseForm() {
    setSelectedDoctorId(null);
    setCasesFilterResetSignal((current) => current + 1);
    setCaseForm(EMPTY_CASE);
    setShowCaseModal(false);
  }

  function syncPendingCases() {
    if (syncPromiseRef.current) return syncPromiseRef.current;
    if (!userId || getApiAvailability() !== "available") return Promise.resolve();
    const promise = runPendingSync();
    syncPromiseRef.current = promise;
    void promise.finally(() => {
      if (syncPromiseRef.current === promise) syncPromiseRef.current = null;
    });
    return promise;
  }

  async function runPendingSync() {
    let confirmedAny = false;
    try {
      const records = await readPendingCases(userId);
      if (
        !records.some(
          (record) => record.state === "pending" && !activeCreateIdsRef.current.has(record.id),
        )
      )
        return;
      if (!(await revalidateSession()) || getStoredSession()?.id !== userId) return;
      for (const record of records) {
        if (record.state === "failed" || activeCreateIdsRef.current.has(record.id)) continue;
        if (getApiAvailability() !== "available" || getStoredSession()?.id !== userId) break;
        setSyncingCaseId(record.id);
        try {
          const created = await createCase(record.payload);
          if (getStoredSession()?.id !== userId) break;
          applyOfficialCases([created]);
          await deleteOfflineRecord(userId, "pending-case", record.id);
          setPendingCases((current) => current.filter((item) => item.id !== record.id));
          confirmedAny = true;
        } catch (error) {
          if (error.status === 401) {
            handleAuthExpired();
            break;
          }
          if (error.status >= 400 && error.status < 500) {
            const failed = { ...record, state: "failed" };
            await saveOfflineRecord(userId, "pending-case", failed, record.id);
            setPendingCases((current) =>
              current.map((item) => (item.id === record.id ? failed : item)),
            );
            continue;
          }
          break; // Network and 5xx failures wait for another real opportunity.
        } finally {
          setSyncingCaseId(null);
        }
      }
    } catch {
      setMessage({ type: "error", text: "Não foi possível consultar os casos locais." });
    } finally {
      setSyncingCaseId(null);
      if (confirmedAny && getStoredSession()?.id === userId) refreshSecondaryData();
    }
  }

  async function loadDashboard() {
    const requestToken = window.localStorage.getItem("cadisk_token");
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const dashboardData = await getDashboardOverview();
      if (
        !dashboardData ||
        typeof dashboardData !== "object" ||
        !dashboardData.status_counts ||
        !Array.isArray(dashboardData.overdue_cases) ||
        !Array.isArray(dashboardData.urgent_open_cases) ||
        !Array.isArray(dashboardData.delivered_cases_month) ||
        !Array.isArray(dashboardData.revenue_trend) ||
        typeof dashboardData.delivered_count_month !== "number"
      ) {
        throw new Error("Resposta inválida da API.");
      }
      setDashboard(dashboardData);
      setSource("dashboard", "live", new Date().toISOString());
      if (userId && getStoredSession()?.id === userId) {
        await saveOfflineRecord(userId, "dashboard", dashboardData).catch(() => {
          setMessage({ type: "error", text: "Não foi possível guardar o dashboard offline." });
        });
      }
      return true;
    } catch (error) {
      if (error.status === 401 && window.localStorage.getItem("cadisk_token") === requestToken) {
        handleAuthExpired();
      } else {
        const record = userId
          ? await readOfflineRecord(userId, "dashboard").catch(() => null)
          : null;
        setDashboard(record?.data || null);
        setSource("dashboard", record ? "snapshot" : "unavailable", record?.updatedAt);
        setDashboardError(record ? null : "Dashboard indisponível sem conexão.");
      }
      return false;
    } finally {
      setDashboardLoading(false);
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
      setMessage({
        type: "success",
        text: isEditing ? "Dentista atualizado." : "Dentista cadastrado.",
      });
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
    const automaticItems =
      caseForm.pricing_mode === "services" ? buildAutomaticCaseItems(caseForm) : [];

    if (automaticItems.some((item) => item.unit_value === null)) {
      setMessage({
        type: "error",
        text: "Preencha o valor de cada dente selecionado antes de criar o caso.",
      });
      return;
    }

    setBusy(true);
    setMessage(null);
    let localCase = null;
    let persisted = false;
    try {
      if (!userId) throw new Error("Aguarde a validação da sessão antes de salvar o caso.");
      const payload = buildCasePayload(selectedDoctorId, caseForm);
      if (automaticItems.length) {
        payload.items = automaticItems;
      }
      const id = pendingReviewId || globalThis.crypto.randomUUID();
      payload.client_request_id = id;
      localCase = {
        id,
        clientRequestId: id,
        payload,
        form: caseForm,
        doctorId: selectedDoctorId,
        createdAt:
          pendingCases.find((item) => item.id === id)?.createdAt || new Date().toISOString(),
        state: "pending",
      };
      activeCreateIdsRef.current.add(id);
      await saveOfflineRecord(userId, "pending-case", localCase, id);
      persisted = true;
      setPendingCases((current) => [localCase, ...current.filter((item) => item.id !== id)]);
      if (draftInForm && userId) {
        try {
          await deleteOfflineRecord(userId, "draft");
          setDraft(null);
          setDraftInForm(false);
        } catch {
          setMessage({
            type: "error",
            text: "Caso salvo, mas não foi possível remover o rascunho antigo.",
          });
        }
      }
      setPendingReviewId(null);
      if (getApiAvailability() === "unavailable") {
        closeCaseForm();
        setMessage({
          type: "success",
          text: "Caso salvo neste dispositivo. Aguardando conexão para sincronizar.",
        });
        return;
      }
      const created = await createCase(payload);
      if (getStoredSession()?.id !== userId) return;
      applyOfficialCases([created]);
      if (selectedDoctorId === null) window.localStorage.removeItem(LAST_CASE_DOCTOR_STORAGE_KEY);
      else window.localStorage.setItem(LAST_CASE_DOCTOR_STORAGE_KEY, String(selectedDoctorId));
      setSelectedCaseId(null);
      closeCaseForm();
      setMessage({
        type: "success",
        text: automaticItems.length
          ? `Caso criado com ${automaticItems.length} ${automaticItems.length === 1 ? "item de serviço automático" : "itens de serviço automáticos"}.`
          : "Caso criado.",
      });
      refreshSecondaryData();
      try {
        await deleteOfflineRecord(userId, "pending-case", id);
        setPendingCases((current) => current.filter((item) => item.id !== id));
      } catch {
        setMessage({
          type: "error",
          text: "Caso criado, mas o registro local não pôde ser removido. Ele será conferido na próxima conexão.",
        });
      }
    } catch (error) {
      if (error.status === 401) {
        handleAuthExpired();
      } else if (
        persisted &&
        (error.code === "OFFLINE_WRITE_BLOCKED" || !error.status || error.status >= 500)
      ) {
        closeCaseForm();
        setMessage({
          type: "success",
          text: "Caso salvo neste dispositivo. Aguardando confirmação do servidor.",
        });
      } else if (persisted && error.status >= 400 && error.status < 500) {
        const failed = { ...localCase, state: "failed" };
        await saveOfflineRecord(userId, "pending-case", failed, failed.id);
        setPendingCases((current) =>
          current.map((item) => (item.id === failed.id ? failed : item)),
        );
        closeCaseForm();
        setMessage({
          type: "error",
          text: "Não foi possível sincronizar o caso. Revise os dados na lista.",
        });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      if (localCase) activeCreateIdsRef.current.delete(localCase.id);
      setBusy(false);
    }
  }

  async function handleItemSubmit(event, options = {}) {
    event.preventDefault();
    if (!selectedCaseId) return false;

    const selectedTeeth = Array.isArray(itemForm.selected_teeth) ? itemForm.selected_teeth : [];
    if (!options.itemId && !selectedTeeth.length) {
      setMessage({
        type: "error",
        text: "Selecione ao menos um dente antes de adicionar o serviço.",
      });
      return false;
    }

    setBusy(true);
    setMessage(null);
    try {
      if (options.itemId) {
        const payload = buildItemPayload(itemForm, selectedCase?.pricing_mode);
        await updateCaseItem(selectedCaseId, options.itemId, payload);
      } else if (selectedTeeth.length) {
        const itemPricingMode = options.pricingMode || selectedCase?.pricing_mode;
        const payloads = buildDentalWorkItems(itemForm, itemPricingMode);
        if (
          payloads.some((payload) => payload.unit_value === null && itemPricingMode !== "fixed")
        ) {
          setMessage({
            type: "error",
            text: "Preencha o valor de cada dente selecionado antes de adicionar o serviço.",
          });
          return false;
        }
        await createCaseItemsBulk(selectedCaseId, payloads);
      } else {
        const payload = buildItemPayload(itemForm, selectedCase?.pricing_mode);
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
      applyOfficialCases(deliveredCases);
      if (shouldClearSelection) {
        setSelectedCaseId(null);
        setItems([]);
      }
      setMessage({
        type: "success",
        text: `${deliveredCases.length} ${deliveredCases.length === 1 ? "caso entregue" : "casos entregues"}.`,
      });
      refreshSecondaryData();
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
      await loadCaseItems(caseId);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function loadCaseItems(caseId) {
    const requestToken = window.localStorage.getItem("cadisk_token");
    try {
      const data = await getCaseItems(caseId);
      if (!validCollection("items", data)) throw new Error("Resposta inválida da API.");
      setSelectedCaseId(caseId);
      setItems(data);
      setItemsUnavailable(false);
      setSource("items", "live", new Date().toISOString());
      if (userId && getStoredSession()?.id === userId) {
        await saveOfflineRecord(userId, "items", data, caseId).catch(() => {
          setMessage({ type: "error", text: "Não foi possível guardar os detalhes offline." });
        });
      }
    } catch (error) {
      if (error.status === 401 && window.localStorage.getItem("cadisk_token") === requestToken) {
        handleAuthExpired();
        return;
      }
      const record = userId
        ? await readOfflineRecord(userId, "items", caseId).catch(() => null)
        : null;
      setSelectedCaseId(caseId);
      setItems(record?.data || []);
      setItemsUnavailable(!record);
      setSource("items", record ? "snapshot" : "unavailable", record?.updatedAt);
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

  async function openNewCaseModal(defaults = {}) {
    setPendingReviewId(null);
    setCaseForm(createDefaultCaseForm(defaults));
    setSelectedDoctorId(getDefaultCaseDoctorId());
    const storedDraft = userId ? await readOfflineRecord(userId, "draft").catch(() => draft) : null;
    setDraft(storedDraft);
    setDraftOffer(Boolean(storedDraft));
    setDraftInForm(false);
    setShowCaseModal(true);
  }

  function restoreCaseDraft() {
    if (!draft) return;
    setCaseForm(createDefaultCaseForm(draft.data.form));
    setSelectedDoctorId(draft.data.doctorId);
    setDraftInForm(true);
    setDraftOffer(false);
  }

  async function discardCaseDraft() {
    if (!userId) return;
    try {
      await deleteOfflineRecord(userId, "draft");
      setDraft(null);
      setDraftInForm(false);
      setDraftOffer(false);
      setCaseForm(createDefaultCaseForm());
      setSelectedDoctorId(getDefaultCaseDoctorId());
      setMessage({ type: "success", text: "Rascunho descartado." });
    } catch {
      setMessage({ type: "error", text: "Não foi possível descartar o rascunho." });
    }
  }

  function reviewPendingCase(localCase) {
    setPendingReviewId(localCase.id);
    setCaseForm(createDefaultCaseForm(localCase.form));
    setSelectedDoctorId(localCase.doctorId);
    setDraftOffer(false);
    setDraftInForm(false);
    setShowCaseModal(true);
  }

  function cancelPendingCase(localCase) {
    if (syncingCaseId === localCase.id || activeCreateIdsRef.current.has(localCase.id)) return;
    requestConfirm({
      title: "Remover caso local",
      description:
        "Este caso ainda não foi confirmado pelo servidor. Removê-lo apagará os dados deste dispositivo.",
      confirmLabel: "Remover",
      action: () => {
        void deleteOfflineRecord(userId, "pending-case", localCase.id)
          .then(() =>
            setPendingCases((current) => current.filter((item) => item.id !== localCase.id)),
          )
          .catch(() =>
            setMessage({ type: "error", text: "Não foi possível remover o caso local." }),
          );
      },
    });
  }

  async function requestLogout() {
    if (getApiAvailability() === "available") await syncPendingCases();
    let remaining;
    try {
      remaining = userId ? await readPendingCases(userId) : pendingCases;
    } catch {
      setMessage({
        type: "error",
        text: "Não foi possível conferir os casos locais antes de sair.",
      });
      return;
    }
    if (!remaining.length) {
      handleLogout();
      return;
    }
    requestConfirm({
      title: "Sair com casos não sincronizados?",
      description: `${remaining.length} ${remaining.length === 1 ? "caso será apagado" : "casos serão apagados"} deste dispositivo ao sair. Esta ação não pode ser desfeita.`,
      confirmLabel: "Sair e apagar",
      action: handleLogout,
    });
  }

  function openNewCaseFromDashboard() {
    openNewCaseModal({ deadline: getLocalDateKey(new Date()) });
  }

  function openNewCaseFromDashboardDate(date) {
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
      const refreshed = await loadAppData({
        selectedCaseId: selectedRemoved ? null : selectedCaseId,
      });
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
    dashboardLoading,
    dashboardError,
    doctors,
    cases,
    pendingCases,
    syncingCaseId,
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
    snapshotMeta,
    itemsUnavailable,
    draft,
    draftOffer,
    setDraftOffer,
    restoreCaseDraft,
    discardCaseDraft,
    reviewPendingCase,
    cancelPendingCase,
    requestLogout,
    selectedCase,
    loadAppData,
    loadDashboard,
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
