import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  Eye,
  Layers3,
  Loader2,
  LogIn,
  LogOut,
  NotebookText,
  Phone,
  Plus,
  RefreshCw,
  Stethoscope,
  Trash2,
  UserPlus,
} from "lucide-react";
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

const EMPTY_DOCTOR = { name: "", clinic_name: "", phone: "", notes: "" };
const EMPTY_LOGIN = { identifier: "", password: "" };
const EMPTY_REGISTER = { email: "", username: "", password: "" };
const EMPTY_CASE = {
  patient_ref: "",
  pricing_mode: "services",
  total_value: "",
  deadline: "",
  priority: "normal",
  notes: "",
};
const EMPTY_ITEM = {
  tooth: "",
  service_type: "",
  unit_value: "",
  material: "",
  color: "",
  notes: "",
};

/**
 * Applies a Brazilian phone mask accepting mobile and landline numbers.
 *
 * @param {string} value Raw input value.
 * @returns {string} Masked phone value.
 */
function formatBrazilianPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${ddd})${number}`;
  if (number.length <= 8) return `(${ddd})${number.slice(0, 4)}-${number.slice(4)}`;
  return `(${ddd})${number.slice(0, 5)}-${number.slice(5)}`;
}

/**
 * Converts a date input value to an ISO datetime accepted by Pydantic.
 *
 * @param {string} value Browser date input value.
 * @returns {string|null} ISO datetime or null.
 */
function toIsoDate(value) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

/**
 * Builds a doctor payload compatible with the backend.
 *
 * @param {typeof EMPTY_DOCTOR} form Controlled doctor form values.
 * @returns {object} Doctor payload.
 */
function buildDoctorPayload(form) {
  return {
    name: form.name.trim(),
    clinic_name: form.clinic_name.trim() || null,
    phone: form.phone.trim() || null,
    notes: form.notes.trim() || null,
  };
}

/**
 * Builds a case payload for simple or advanced form mode.
 *
 * @param {number} doctorId Selected doctor id.
 * @param {typeof EMPTY_CASE} form Controlled case form values.
 * @param {boolean} advanced Whether advanced fields should be included.
 * @returns {object} Case payload.
 */
function buildCasePayload(doctorId, form, advanced) {
  const payload = {
    doctor_id: doctorId,
    patient_ref: form.patient_ref.trim(),
    pricing_mode: form.pricing_mode,
  };

  if (form.pricing_mode === "fixed") {
    payload.total_value = form.total_value.trim();
  }

  if (advanced) {
    payload.deadline = toIsoDate(form.deadline);
    payload.priority = form.priority;
    payload.notes = form.notes.trim() || null;
  }

  return payload;
}

/**
 * Builds an item/service payload for simple or advanced form mode.
 *
 * @param {typeof EMPTY_ITEM} form Controlled item form values.
 * @param {boolean} advanced Whether advanced fields should be included.
 * @returns {object} Item payload.
 */
function buildItemPayload(form, advanced) {
  const payload = {
    tooth: form.tooth.trim(),
    service_type: form.service_type.trim(),
    unit_value: form.unit_value.trim() || null,
  };

  if (advanced) {
    payload.material = form.material.trim() || null;
    payload.color = form.color.trim() || null;
    payload.notes = form.notes.trim() || null;
  }

  return payload;
}

/**
 * Reads a count from the dashboard payload.
 *
 * @param {object|null} dashboard Dashboard payload.
 * @param {string} key Status key.
 * @returns {number} Status count.
 */
function statusCount(dashboard, key) {
  return dashboard?.status_counts?.[key] ?? 0;
}

/**
 * Main authenticated Cadista frontend.
 *
 * @returns {JSX.Element} React application.
 */
export default function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);

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
  const [loading, setLoading] = useState(Boolean(session));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId],
  );
  const selectedCase = useMemo(
    () => cases.find((caseItem) => caseItem.id === selectedCaseId) || null,
    [cases, selectedCaseId],
  );

  /**
   * Updates controlled auth forms.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event Input event.
   * @param {"login"|"register"} mode Form identifier.
   * @returns {void}
   */
  function handleAuthChange(event, mode) {
    const { name, value } = event.target;
    const setter = mode === "login" ? setLoginForm : setRegisterForm;
    setter((current) => ({ ...current, [name]: value }));
  }

  /**
   * Updates the doctor form and applies the phone mask.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} event Input event.
   * @returns {void}
   */
  function handleDoctorChange(event) {
    const { name, value } = event.target;
    setDoctorForm((current) => ({
      ...current,
      [name]: name === "phone" ? formatBrazilianPhone(value) : value,
    }));
  }

  /**
   * Updates the case form.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>} event Input event.
   * @returns {void}
   */
  function handleCaseChange(event) {
    const { name, value } = event.target;
    setCaseForm((current) => ({ ...current, [name]: value }));
  }

  /**
   * Updates the item/service form.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} event Input event.
   * @returns {void}
   */
  function handleItemChange(event) {
    const { name, value } = event.target;
    setItemForm((current) => ({ ...current, [name]: value }));
  }

  /**
   * Loads top-level protected data.
   *
   * @returns {Promise<void>} Resolves when data is loaded.
   */
  async function loadAppData() {
    setLoading(true);
    setMessage(null);
    try {
      const [doctorData, dashboardData] = await Promise.all([
        getDoctors(),
        getDashboardOverview(),
      ]);
      setDoctors(Array.isArray(doctorData) ? doctorData : []);
      setDashboard(dashboardData);
    } catch (error) {
      clearSession();
      setSession(null);
      setAuthMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads cases for a doctor and opens the contextual cases panel.
   *
   * @param {number} doctorId Doctor id.
   * @returns {Promise<void>} Resolves when cases are loaded.
   */
  async function openDoctorCases(doctorId) {
    setBusy(true);
    setMessage(null);
    try {
      const data = await getCases({ doctorId });
      setSelectedDoctorId(doctorId);
      setSelectedCaseId(null);
      setCases(Array.isArray(data) ? data : []);
      setItems([]);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Loads items/services for a case and opens the contextual items panel.
   *
   * @param {number} caseId Case id.
   * @returns {Promise<void>} Resolves when items are loaded.
   */
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

  /**
   * Authenticates the user with the backend.
   *
   * @param {React.FormEvent<HTMLFormElement>} event Submit event.
   * @returns {Promise<void>} Resolves when login finishes.
   */
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

  /**
   * Registers a new user and enters the protected app.
   *
   * @param {React.FormEvent<HTMLFormElement>} event Submit event.
   * @returns {Promise<void>} Resolves when registration finishes.
   */
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

  /**
   * Logs out and clears local screen state.
   *
   * @returns {void}
   */
  function handleLogout() {
    clearSession();
    setSession(null);
    setDoctors([]);
    setCases([]);
    setItems([]);
    setDashboard(null);
  }

  /**
   * Creates a doctor.
   *
   * @param {React.FormEvent<HTMLFormElement>} event Submit event.
   * @returns {Promise<void>} Resolves when creation finishes.
   */
  async function handleDoctorSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const created = await createDoctor(buildDoctorPayload(doctorForm));
      setDoctors((current) => [created, ...current]);
      setDoctorForm(EMPTY_DOCTOR);
      setMessage({ type: "success", text: "Doutor cadastrado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Creates a case for the selected doctor.
   *
   * @param {React.FormEvent<HTMLFormElement>} event Submit event.
   * @returns {Promise<void>} Resolves when creation finishes.
   */
  async function handleCaseSubmit(event) {
    event.preventDefault();
    if (!selectedDoctorId) return;

    setBusy(true);
    setMessage(null);
    try {
      const created = await createCase(
        buildCasePayload(selectedDoctorId, caseForm, caseAdvanced),
      );
      setCases((current) => [created, ...current]);
      setCaseForm(EMPTY_CASE);
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Caso criado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Creates an item/service for the selected case.
   *
   * @param {React.FormEvent<HTMLFormElement>} event Submit event.
   * @returns {Promise<void>} Resolves when creation finishes.
   */
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
      setCases(await getCases({ doctorId: selectedDoctorId }));
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Item/servico criado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Advances a case through the allowed backend status flow.
   *
   * @param {object} caseItem Case object.
   * @returns {Promise<void>} Resolves when update finishes.
   */
  async function advanceCase(caseItem) {
    const nextStatus = caseItem.status === "pending" ? "completed" : "delivered";
    setBusy(true);
    setMessage(null);
    try {
      const updated = await updateCase(caseItem.id, { status: nextStatus });
      setCases((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Status do caso atualizado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Deletes a doctor and updates the list.
   *
   * @param {number} doctorId Doctor id.
   * @returns {Promise<void>} Resolves when deletion finishes.
   */
  async function removeDoctor(doctorId) {
    setBusy(true);
    setMessage(null);
    try {
      await deleteDoctor(doctorId);
      setDoctors((current) => current.filter((doctor) => doctor.id !== doctorId));
      if (selectedDoctorId === doctorId) {
        setSelectedDoctorId(null);
        setSelectedCaseId(null);
        setCases([]);
        setItems([]);
      }
      setMessage({ type: "success", text: "Doutor removido." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Deletes a case and updates contextual panels.
   *
   * @param {number} caseId Case id.
   * @returns {Promise<void>} Resolves when deletion finishes.
   */
  async function removeCase(caseId) {
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

  /**
   * Deletes an item/service and refreshes case totals.
   *
   * @param {number} itemId Item id.
   * @returns {Promise<void>} Resolves when deletion finishes.
   */
  async function removeItem(itemId) {
    setBusy(true);
    setMessage(null);
    try {
      await deleteCaseItem(selectedCaseId, itemId);
      setItems((current) => current.filter((item) => item.id !== itemId));
      setCases(await getCases({ doctorId: selectedDoctorId }));
      setDashboard(await getDashboardOverview());
      setMessage({ type: "success", text: "Item/servico removido." });
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
        setAuthMessage({ type: "error", text: "Sessao expirada. Faca login novamente." });
      });
  }, [session?.username]);

  if (!session) {
    return (
      <main className="app-shell auth-shell">
        <style>{styles}</style>
        <section className="auth-layout">
          <div className="auth-copy">
            <span className="eyebrow">Cadista</span>
            <h1>Acesso operacional</h1>
            <p>Entre para carregar dashboard, doutores, casos e serviços.</p>
          </div>
          <section className="panel auth-card">
            <div className="segmented">
              <button className={authMode === "login" ? "active" : ""} type="button" onClick={() => setAuthMode("login")}>
                <LogIn size={17} /> Login
              </button>
              <button className={authMode === "register" ? "active" : ""} type="button" onClick={() => setAuthMode("register")}>
                <UserPlus size={17} /> Cadastro
              </button>
            </div>
            {authMessage && <p className={`feedback ${authMessage.type}`}>{authMessage.text}</p>}
            {authMode === "login" ? (
              <form className="form-grid" onSubmit={handleLogin}>
                <label>Usuario ou email<input name="identifier" value={loginForm.identifier} onChange={(event) => handleAuthChange(event, "login")} required /></label>
                <label>Senha<input name="password" type="password" value={loginForm.password} onChange={(event) => handleAuthChange(event, "login")} required /></label>
                <button className="primary-button" disabled={authLoading} type="submit">{authLoading ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />} Entrar</button>
              </form>
            ) : (
              <form className="form-grid" onSubmit={handleRegister}>
                <label>Email<input name="email" type="email" value={registerForm.email} onChange={(event) => handleAuthChange(event, "register")} required /></label>
                <label>Usuario<input name="username" value={registerForm.username} onChange={(event) => handleAuthChange(event, "register")} required /></label>
                <label>Senha<input name="password" type="password" minLength="6" value={registerForm.password} onChange={(event) => handleAuthChange(event, "register")} required /></label>
                <button className="primary-button" disabled={authLoading} type="submit">{authLoading ? <Loader2 className="spin" size={18} /> : <UserPlus size={18} />} Criar acesso</button>
              </form>
            )}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <style>{styles}</style>
      <section className="topbar">
        <div>
          <span className="eyebrow">Cadista</span>
          <h1>Gestao operacional</h1>
          <p className="session-line">Sessao ativa: {session.username}</p>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" type="button" onClick={loadAppData}><RefreshCw size={18} /> Atualizar</button>
          <button className="ghost-button" type="button" onClick={handleLogout}><LogOut size={18} /> Sair</button>
        </div>
      </section>

      <section className="summary-strip" aria-label="Resumo geral">
        <div><span>Doutores ativos</span><strong>{doctors.length}</strong></div>
        <div><span>Total entregue no mes</span><strong>R$ {Number(dashboard?.delivered_total_month ?? 0).toFixed(2)}</strong></div>
        <div><span>Entregas do mes</span><strong>{dashboard?.delivered_count_month ?? 0}</strong></div>
      </section>

      <section className="panel dashboard-panel">
        <div className="section-heading"><BarChart3 size={21} /><h2>Dashboard simples</h2></div>
        <div className="dashboard-grid">
          <span>Entregues <strong>{statusCount(dashboard, "delivered")}</strong></span>
          <span>Concluidos <strong>{statusCount(dashboard, "completed")}</strong></span>
          <span>Pendentes <strong>{statusCount(dashboard, "pending")}</strong></span>
          <span>Urgentes <strong>{dashboard?.urgent_open_cases?.length ?? 0}</strong></span>
        </div>
      </section>

      {message && <p className={`feedback ${message.type}`}>{message.text}</p>}

      <section className="workspace">
        <form className="panel form-grid" onSubmit={handleDoctorSubmit}>
          <div className="section-heading"><Stethoscope size={21} /><h2>Novo doutor</h2></div>
          <label>Nome<input name="name" value={doctorForm.name} onChange={handleDoctorChange} placeholder="Dra. Ana Martins" required /></label>
          <label>Clinica<span className="input-with-icon"><Building2 size={17} /><input name="clinic_name" value={doctorForm.clinic_name} onChange={handleDoctorChange} placeholder="Clinica Sorriso" /></span></label>
          <label>Telefone<span className="input-with-icon"><Phone size={17} /><input name="phone" inputMode="tel" value={doctorForm.phone} onChange={handleDoctorChange} placeholder="(81)99999-9999" /></span></label>
          <label>Observacoes<span className="input-with-icon textarea-wrap"><NotebookText size={17} /><textarea name="notes" rows="5" value={doctorForm.notes} onChange={handleDoctorChange} placeholder="Preferencias, prazos e detalhes comerciais" /></span></label>
          <button className="primary-button" disabled={busy} type="submit"><Plus size={18} /> Cadastrar</button>
        </form>

        <section className="panel">
          <div className="section-heading list-heading">
            <div><h2>Doutores cadastrados</h2><p>{loading ? "Carregando..." : "Adicione casos ou visualize casos existentes"}</p></div>
          </div>
          {loading ? (
            <div className="state-box"><Loader2 className="spin" size={24} /> Carregando dados...</div>
          ) : doctors.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>Clinica</th><th>Telefone</th><th>Casos</th><th>Acoes</th></tr></thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id}>
                      <td><strong>{doctor.name}</strong>{doctor.notes && <small>{doctor.notes}</small>}</td>
                      <td>{doctor.clinic_name || "-"}</td>
                      <td>{doctor.phone || "-"}</td>
                      <td>{doctor.cases_count ?? 0}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-button" title="Adicionar caso" type="button" onClick={() => openDoctorCases(doctor.id)}><Plus size={17} /></button>
                          <button className="icon-button" title="Visualizar casos" type="button" onClick={() => openDoctorCases(doctor.id)}><Eye size={17} /></button>
                          <button className="icon-button danger" title="Excluir doutor" type="button" onClick={() => removeDoctor(doctor.id)}><Trash2 size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="state-box empty"><Stethoscope size={26} /> Nenhum dentista cadastrado.</div>
          )}
        </section>
      </section>

      {selectedDoctor && (
        <section className="detail-grid">
          <form className="panel form-grid" onSubmit={handleCaseSubmit}>
            <div className="section-heading split-heading">
              <span><ClipboardList size={21} /><h2>Novo caso para {selectedDoctor.name}</h2></span>
              <button className="ghost-button compact" type="button" onClick={() => setCaseAdvanced((value) => !value)}>
                {caseAdvanced ? "Formulario simples" : "Formulario avancado"}
              </button>
            </div>
            <label>Paciente/referencia<input name="patient_ref" value={caseForm.patient_ref} onChange={handleCaseChange} placeholder="Paciente ou codigo" required /></label>
            <label>Cobranca<select name="pricing_mode" value={caseForm.pricing_mode} onChange={handleCaseChange}><option value="services">Por servicos</option><option value="fixed">Valor fixo</option></select></label>
            {caseForm.pricing_mode === "fixed" && <label>Valor fixo<input name="total_value" value={caseForm.total_value} onChange={handleCaseChange} placeholder="350,00" required /></label>}
            {caseAdvanced && (
              <>
                <label>Prazo<input name="deadline" type="date" value={caseForm.deadline} onChange={handleCaseChange} /></label>
                <label>Prioridade<select name="priority" value={caseForm.priority} onChange={handleCaseChange}><option value="normal">Normal</option><option value="urgent">Urgente</option></select></label>
                <label>Observacoes<textarea name="notes" rows="4" value={caseForm.notes} onChange={handleCaseChange} /></label>
              </>
            )}
            <button className="primary-button" disabled={busy} type="submit"><Plus size={18} /> Criar caso</button>
          </form>

          <section className="panel">
            <div className="section-heading list-heading">
              <div><h2>Casos de {selectedDoctor.name}</h2><p>{cases.length ? "Selecione um caso para adicionar itens/servicos" : "Nenhum caso cadastrado"}</p></div>
            </div>
            {cases.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Caso</th><th>Status</th><th>Cobranca</th><th>Total</th><th>Itens</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {cases.map((caseItem) => (
                      <tr key={caseItem.id}>
                        <td><strong>#{caseItem.id} - {caseItem.patient_ref}</strong>{caseItem.notes && <small>{caseItem.notes}</small>}</td>
                        <td>{caseItem.status}</td>
                        <td>{caseItem.pricing_mode === "fixed" ? "Fixo" : "Servicos"}</td>
                        <td>R$ {Number(caseItem.total_value ?? 0).toFixed(2)}</td>
                        <td>{caseItem.items_count ?? caseItem.items?.length ?? 0}</td>
                        <td><div className="row-actions">
                          <button className="icon-button" title="Ver itens" type="button" onClick={() => openCaseItems(caseItem.id)}><Layers3 size={17} /></button>
                          {caseItem.status !== "delivered" && <button className="icon-button" title="Avancar status" type="button" onClick={() => advanceCase(caseItem)}><RefreshCw size={17} /></button>}
                          <button className="icon-button danger" title="Excluir caso" type="button" onClick={() => removeCase(caseItem.id)}><Trash2 size={17} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="state-box empty"><ClipboardList size={26} /> Nenhum caso para este doutor.</div>
            )}
          </section>
        </section>
      )}

      {selectedCase && (
        <section className="detail-grid">
          <form className="panel form-grid" onSubmit={handleItemSubmit}>
            <div className="section-heading split-heading">
              <span><Layers3 size={21} /><h2>Novo item do caso #{selectedCase.id}</h2></span>
              <button className="ghost-button compact" type="button" onClick={() => setItemAdvanced((value) => !value)}>
                {itemAdvanced ? "Formulario simples" : "Formulario avancado"}
              </button>
            </div>
            <label>Dente/area<input name="tooth" value={itemForm.tooth} onChange={handleItemChange} placeholder="11 ou protese total" required /></label>
            <label>Servico<input name="service_type" value={itemForm.service_type} onChange={handleItemChange} placeholder="Coroa, faceta, placa..." required /></label>
            <label>Valor unitario<input name="unit_value" value={itemForm.unit_value} onChange={handleItemChange} placeholder="120,00" required={selectedCase.pricing_mode === "services"} /></label>
            {itemAdvanced && (
              <>
                <label>Material<input name="material" value={itemForm.material} onChange={handleItemChange} placeholder="Zirconia, resina..." /></label>
                <label>Cor<input name="color" value={itemForm.color} onChange={handleItemChange} placeholder="A2, BL1..." /></label>
                <label>Observacoes<textarea name="notes" rows="4" value={itemForm.notes} onChange={handleItemChange} /></label>
              </>
            )}
            <button className="primary-button" disabled={busy} type="submit"><Plus size={18} /> Adicionar item</button>
          </form>

          <section className="panel">
            <div className="section-heading list-heading">
              <div><h2>Itens/servicos do caso #{selectedCase.id}</h2><p>{items.length ? "Servicos vinculados ao caso" : "Nenhum item cadastrado"}</p></div>
            </div>
            {items.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Dente/area</th><th>Servico</th><th>Material</th><th>Cor</th><th>Valor</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.tooth}</td>
                        <td><strong>{item.service_type}</strong>{item.notes && <small>{item.notes}</small>}</td>
                        <td>{item.material || "-"}</td>
                        <td>{item.color || "-"}</td>
                        <td>R$ {Number(item.unit_value ?? 0).toFixed(2)}</td>
                        <td><button className="icon-button danger" title="Excluir item" type="button" onClick={() => removeItem(item.id)}><Trash2 size={17} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="state-box empty"><Layers3 size={26} /> Nenhum item vinculado.</div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}

const styles = `
  :root {
    color: #1f2933;
    background: #eef2f5;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * { box-sizing: border-box; }
  body { margin: 0; min-width: 320px; min-height: 100vh; background: #eef2f5; }
  button, input, textarea, select { font: inherit; }

  .app-shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 44px; }
  .auth-shell { min-height: 100vh; display: grid; align-items: center; }
  .auth-layout { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(320px, 430px); gap: 20px; }
  .auth-copy { display: flex; flex-direction: column; justify-content: center; padding: 24px; }
  .auth-copy p, .session-line, .panel p, label, small { color: #5f6f7f; }

  .panel, .auth-copy, .summary-strip div, .state-box {
    background: #ffffff;
    border: 1px solid #d9e1e8;
    border-radius: 8px;
    box-shadow: 0 16px 36px rgba(31, 41, 51, 0.08);
    padding: 18px;
  }

  .topbar { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
  .topbar-actions, .row-actions, .dashboard-grid, .segmented { display: flex; gap: 10px; flex-wrap: wrap; }
  .eyebrow { color: #047857; font-size: 0.82rem; font-weight: 800; letter-spacing: 0; text-transform: uppercase; }
  h1, h2, p { margin: 0; }
  h1 { color: #17202a; font-size: clamp(2rem, 7vw, 3.4rem); line-height: 1; letter-spacing: 0; }
  h2 { color: #1f2933; font-size: 1.05rem; letter-spacing: 0; }

  .summary-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
  .summary-strip div { box-shadow: none; }
  .summary-strip strong { display: block; margin-top: 4px; color: #17202a; font-size: 1.28rem; }
  .dashboard-panel { display: grid; gap: 14px; margin-bottom: 16px; }
  .dashboard-grid span { display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; border-radius: 999px; background: #f1f5f9; color: #475569; font-weight: 700; }
  .dashboard-grid strong { color: #17202a; margin-left: 6px; }

  .workspace, .detail-grid { display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 16px; align-items: start; }
  .detail-grid { margin-top: 16px; }
  .form-grid { display: grid; gap: 14px; }
  .section-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
  .list-heading { align-items: start; justify-content: space-between; margin-bottom: 14px; }
  .split-heading { justify-content: space-between; align-items: start; }
  .split-heading span { display: inline-flex; align-items: center; gap: 10px; }

  label { display: grid; gap: 7px; font-size: 0.9rem; font-weight: 700; }
  input, textarea, select { width: 100%; border: 1px solid #cbd5df; border-radius: 7px; color: #17202a; background: #fbfcfd; outline: none; padding: 11px 12px; }
  input:focus, textarea:focus, select:focus { border-color: #047857; box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.13); }
  .input-with-icon { position: relative; display: block; }
  .input-with-icon svg { position: absolute; top: 12px; left: 11px; color: #718096; pointer-events: none; }
  .input-with-icon input, .input-with-icon textarea { padding-left: 38px; }
  .textarea-wrap svg { top: 13px; }

  .primary-button, .ghost-button, .icon-button, .segmented button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 7px;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  }
  .primary-button { min-height: 44px; color: #ffffff; background: #047857; border: 0; font-weight: 800; }
  .ghost-button, .segmented button { min-height: 40px; padding: 0 14px; color: #1f2933; background: #ffffff; border: 1px solid #cbd5df; font-weight: 800; }
  .ghost-button.compact { min-height: 34px; font-size: 0.85rem; }
  .segmented { margin-bottom: 16px; }
  .segmented button.active { color: #ffffff; background: #047857; border-color: #047857; }
  .icon-button { width: 36px; height: 36px; border: 0; background: #f1f5f9; color: #475569; }
  .icon-button.danger { color: #b91c1c; background: #fee2e2; }
  .primary-button:hover, .ghost-button:hover, .icon-button:hover, .segmented button:hover { transform: translateY(-1px); }
  button:disabled { cursor: not-allowed; opacity: 0.68; transform: none; }

  .feedback { margin-bottom: 16px; padding: 12px 14px; border-radius: 8px; border: 1px solid transparent; font-weight: 700; }
  .feedback.success { color: #065f46; background: #ecfdf5; border-color: #a7f3d0; }
  .feedback.error { color: #9f1239; background: #fff1f2; border-color: #fecdd3; }

  .table-wrap { overflow-x: auto; border: 1px solid #d9e1e8; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; min-width: 680px; background: #ffffff; }
  th, td { padding: 13px 14px; border-bottom: 1px solid #edf1f5; text-align: left; vertical-align: top; }
  th { color: #5f6f7f; background: #f7f9fb; font-size: 0.78rem; text-transform: uppercase; }
  td strong, td small { display: block; }
  td small { margin-top: 4px; max-width: 330px; line-height: 1.4; }
  tr:last-child td { border-bottom: 0; }

  .state-box { min-height: 180px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #5f6f7f; font-weight: 800; box-shadow: none; }
  .state-box.empty { flex-direction: column; }
  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 860px) {
    .topbar, .auth-layout { align-items: stretch; grid-template-columns: 1fr; flex-direction: column; }
    .summary-strip, .workspace, .detail-grid { grid-template-columns: 1fr; }
    .ghost-button { width: max-content; }
  }

  @media (max-width: 520px) {
    .app-shell { width: min(100% - 20px, 1180px); padding-top: 18px; }
    .panel, .auth-copy, .summary-strip div { padding: 14px; }
  }
`;
