import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  NotebookText,
  Phone,
  Plus,
  RefreshCw,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { createDoctor, deleteDoctor, getDoctors } from "./services/api.js";

const EMPTY_FORM = {
  name: "",
  clinic_name: "",
  phone: "",
  notes: "",
};

/**
 * Normalizes form values before sending them to the FastAPI backend.
 *
 * @param {typeof EMPTY_FORM} form Controlled form values.
 * @returns {{name: string, clinic_name: string|null, phone: string|null, notes: string|null}}
 * Payload compatible with the DoctorCreate schema.
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
 * Renders the Cadista doctors management dashboard.
 *
 * @returns {JSX.Element} Responsive React interface for Doctor CRUD actions.
 */
export default function App() {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null);

  const hasDoctors = doctors.length > 0;
  const activeCount = useMemo(() => doctors.length, [doctors]);

  /**
   * Updates a controlled field in the doctor form.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} event
   * Input change event from the form.
   */
  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  /**
   * Loads doctors from the API and updates visual feedback states.
   *
   * @returns {Promise<void>} Resolves when the list is refreshed.
   */
  async function loadDoctors() {
    setLoading(true);
    setMessage(null);

    try {
      const data = await getDoctors();
      setDoctors(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Creates a doctor and refreshes local state without reloading the page.
   *
   * @param {React.FormEvent<HTMLFormElement>} event Submit event.
   * @returns {Promise<void>} Resolves after the create request finishes.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    const payload = buildDoctorPayload(form);

    if (!payload.name) {
      setMessage({ type: "error", text: "Informe o nome do doutor." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const createdDoctor = await createDoctor(payload);
      setDoctors((current) => [createdDoctor, ...current]);
      setForm(EMPTY_FORM);
      setMessage({ type: "success", text: "Doutor cadastrado com sucesso." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  /**
   * Deletes a doctor and removes it from the list optimistically after success.
   *
   * @param {number} doctorId Unique doctor identifier.
   * @returns {Promise<void>} Resolves after the delete request finishes.
   */
  async function handleDelete(doctorId) {
    setDeletingId(doctorId);
    setMessage(null);

    try {
      await deleteDoctor(doctorId);
      setDoctors((current) => current.filter((doctor) => doctor.id !== doctorId));
      setMessage({ type: "success", text: "Doutor removido da lista ativa." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  return (
    <main className="app-shell">
      <style>{styles}</style>

      <section className="topbar">
        <div>
          <span className="eyebrow">Cadista</span>
          <h1>Gestao de doutores</h1>
        </div>
        <button className="ghost-button" type="button" onClick={loadDoctors}>
          <RefreshCw size={18} />
          Atualizar
        </button>
      </section>

      <section className="summary-strip" aria-label="Resumo operacional">
        <div>
          <span>Doutores ativos</span>
          <strong>{activeCount}</strong>
        </div>
        <div>
          <span>API</span>
          <strong>FastAPI</strong>
        </div>
        <div>
          <span>Frontend</span>
          <strong>React + Vite</strong>
        </div>
      </section>

      {message && <p className={`feedback ${message.type}`}>{message.text}</p>}

      <section className="workspace">
        <form className="doctor-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <Stethoscope size={21} />
            <h2>Novo doutor</h2>
          </div>

          <label>
            Nome
            <input
              name="name"
              value={form.name}
              onChange={handleFieldChange}
              placeholder="Dra. Ana Martins"
              required
            />
          </label>

          <label>
            Clinica
            <span className="input-with-icon">
              <Building2 size={17} />
              <input
                name="clinic_name"
                value={form.clinic_name}
                onChange={handleFieldChange}
                placeholder="Clinica Sorriso"
              />
            </span>
          </label>

          <label>
            Telefone
            <span className="input-with-icon">
              <Phone size={17} />
              <input
                name="phone"
                value={form.phone}
                onChange={handleFieldChange}
                placeholder="(81)99999-9999"
              />
            </span>
          </label>

          <label>
            Observacoes
            <span className="input-with-icon textarea-wrap">
              <NotebookText size={17} />
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleFieldChange}
                placeholder="Preferencias, prazos e detalhes comerciais"
                rows="5"
              />
            </span>
          </label>

          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
            {saving ? "Salvando" : "Cadastrar"}
          </button>
        </form>

        <section className="doctor-panel">
          <div className="section-heading list-heading">
            <div>
              <h2>Doutores cadastrados</h2>
              <p>{hasDoctors ? "Lista sincronizada com a API" : "Nenhum registro ativo"}</p>
            </div>
          </div>

          {loading ? (
            <div className="state-box">
              <Loader2 className="spin" size={24} />
              <span>Carregando doutores...</span>
            </div>
          ) : hasDoctors ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Clinica</th>
                    <th>Telefone</th>
                    <th>Casos</th>
                    <th aria-label="Acoes" />
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id}>
                      <td>
                        <strong>{doctor.name}</strong>
                        {doctor.notes && <small>{doctor.notes}</small>}
                      </td>
                      <td>{doctor.clinic_name || "-"}</td>
                      <td>{doctor.phone || "-"}</td>
                      <td>{doctor.cases_count ?? 0}</td>
                      <td className="actions-cell">
                        <button
                          className="icon-button danger"
                          type="button"
                          title="Excluir doutor"
                          disabled={deletingId === doctor.id}
                          onClick={() => handleDelete(doctor.id)}
                        >
                          {deletingId === doctor.id ? (
                            <Loader2 className="spin" size={17} />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="state-box empty">
              <Stethoscope size={26} />
              <span>Nenhum dentista cadastrado.</span>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const styles = `
  :root {
    color: #1f2933;
    background: #eef2f5;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background: #eef2f5;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  .app-shell {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
    padding: 28px 0 44px;
  }

  .topbar {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .eyebrow {
    color: #047857;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    color: #17202a;
    font-size: clamp(2rem, 7vw, 3.4rem);
    line-height: 1;
    letter-spacing: 0;
  }

  h2 {
    color: #1f2933;
    font-size: 1.05rem;
    letter-spacing: 0;
  }

  .summary-strip,
  .workspace,
  .doctor-form,
  .doctor-panel {
    display: grid;
    gap: 16px;
  }

  .summary-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-bottom: 16px;
  }

  .summary-strip div,
  .doctor-form,
  .doctor-panel,
  .state-box {
    background: #ffffff;
    border: 1px solid #d9e1e8;
    border-radius: 8px;
  }

  .summary-strip div {
    padding: 16px;
  }

  .summary-strip span,
  .doctor-panel p,
  label,
  small {
    color: #5f6f7f;
  }

  .summary-strip strong {
    display: block;
    margin-top: 4px;
    color: #17202a;
    font-size: 1.28rem;
  }

  .workspace {
    grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
    align-items: start;
  }

  .doctor-form,
  .doctor-panel {
    padding: 18px;
    box-shadow: 0 16px 36px rgba(31, 41, 51, 0.08);
  }

  .section-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 2px;
  }

  .list-heading {
    align-items: start;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  label {
    display: grid;
    gap: 7px;
    font-size: 0.9rem;
    font-weight: 700;
  }

  input,
  textarea {
    width: 100%;
    border: 1px solid #cbd5df;
    border-radius: 7px;
    color: #17202a;
    background: #fbfcfd;
    outline: none;
    padding: 11px 12px;
  }

  input:focus,
  textarea:focus {
    border-color: #047857;
    box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.13);
  }

  .input-with-icon {
    position: relative;
    display: block;
  }

  .input-with-icon svg {
    position: absolute;
    top: 12px;
    left: 11px;
    color: #718096;
    pointer-events: none;
  }

  .input-with-icon input,
  .input-with-icon textarea {
    padding-left: 38px;
  }

  .textarea-wrap svg {
    top: 13px;
  }

  .primary-button,
  .ghost-button,
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 7px;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  }

  .primary-button {
    min-height: 44px;
    color: #ffffff;
    background: #047857;
    font-weight: 800;
  }

  .ghost-button {
    min-height: 40px;
    padding: 0 14px;
    color: #1f2933;
    background: #ffffff;
    border: 1px solid #cbd5df;
    font-weight: 800;
  }

  .primary-button:hover,
  .ghost-button:hover,
  .icon-button:hover {
    transform: translateY(-1px);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.68;
    transform: none;
  }

  .feedback {
    margin-bottom: 16px;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid transparent;
    font-weight: 700;
  }

  .feedback.success {
    color: #065f46;
    background: #ecfdf5;
    border-color: #a7f3d0;
  }

  .feedback.error {
    color: #9f1239;
    background: #fff1f2;
    border-color: #fecdd3;
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid #d9e1e8;
    border-radius: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 680px;
    background: #ffffff;
  }

  th,
  td {
    padding: 13px 14px;
    border-bottom: 1px solid #edf1f5;
    text-align: left;
    vertical-align: top;
  }

  th {
    color: #5f6f7f;
    background: #f7f9fb;
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  td strong,
  td small {
    display: block;
  }

  td small {
    margin-top: 4px;
    max-width: 330px;
    line-height: 1.4;
  }

  tr:last-child td {
    border-bottom: 0;
  }

  .actions-cell {
    width: 58px;
    text-align: right;
  }

  .icon-button {
    width: 36px;
    height: 36px;
    background: #f1f5f9;
    color: #475569;
  }

  .icon-button.danger {
    color: #b91c1c;
    background: #fee2e2;
  }

  .state-box {
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #5f6f7f;
    font-weight: 800;
  }

  .state-box.empty {
    flex-direction: column;
  }

  .spin {
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 860px) {
    .topbar {
      align-items: stretch;
      flex-direction: column;
    }

    .summary-strip,
    .workspace {
      grid-template-columns: 1fr;
    }

    .ghost-button {
      width: max-content;
    }
  }

  @media (max-width: 520px) {
    .app-shell {
      width: min(100% - 20px, 1180px);
      padding-top: 18px;
    }

    .doctor-form,
    .doctor-panel,
    .summary-strip div {
      padding: 14px;
    }
  }
`;
