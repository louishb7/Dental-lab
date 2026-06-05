import { CreditCard, FilePlus2, ListChecks } from "lucide-react";
import OdontogramSelector from "./OdontogramSelector.jsx";
import Button from "../ui/Button.jsx";
import FormField from "../ui/FormField.jsx";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyToNumber,
} from "../../utils/formatters.js";
import { sortTeethByFdi } from "../../utils/odontogram.js";

export default function CaseIntakeForm({
  doctors,
  selectedDoctorId,
  caseForm,
  busy,
  submitLabel = "Salvar caso",
  submitIcon = FilePlus2,
  onDoctorChange,
  onCaseChange,
  onSubmit,
  layout = "stacked",
}) {
  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId);
  const SubmitIcon = submitIcon;
  const selectedTeeth = sortTeethByFdi(caseForm.selected_teeth);
  const unitValues = caseForm.unit_values || {};
  const unitTotal = selectedTeeth.reduce(
    (sum, tooth) => sum + (parseCurrencyToNumber(unitValues[tooth]) || 0),
    0,
  );
  const totalValue = caseForm.pricing_mode === "fixed"
    ? parseCurrencyToNumber(caseForm.total_value) || 0
    : unitTotal;

  function syncField(name, value) {
    onCaseChange({ target: { name, value } });
  }

  function handleTeethChange(nextTeeth) {
    const nextUnitValues = nextTeeth.reduce((accumulator, tooth) => {
      accumulator[tooth] = unitValues[tooth] || "";
      return accumulator;
    }, {});

    syncField("selected_teeth", nextTeeth);
    syncField("unit_values", nextUnitValues);
  }

  function handleUnitValueChange(tooth, value) {
    syncField("unit_values", {
      ...unitValues,
      [tooth]: formatCurrencyInput(value),
    });
  }

  return (
    <form className={`case-creation-workspace case-intake-form ${layout}`} onSubmit={onSubmit}>
      <section className="case-create-panel case-create-info">
        <div className="case-create-section-title">Informações do caso</div>

        <FormField label="Dentista responsável">
          <select
            value={selectedDoctorId || ""}
            onChange={(event) => onDoctorChange(Number(event.target.value) || null)}
            required
          >
            <option value="">Selecione um dentista</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Paciente / Referência">
          <input
            name="patient_ref"
            value={caseForm.patient_ref}
            onChange={onCaseChange}
            placeholder="Paciente, referência ou código interno"
            required
          />
        </FormField>

        <FormField label="Prazo de entrega">
          <input name="deadline" type="date" value={caseForm.deadline} onChange={onCaseChange} />
        </FormField>

        <FormField label="Observações">
          <textarea
            name="notes"
            rows="4"
            value={caseForm.notes}
            onChange={onCaseChange}
            placeholder="Use para dentes, detalhes rápidos, observações ou combinações do caso"
          />
        </FormField>

        <div className="form-field">
          <span>Cobrança</span>
          <div className="pricing-mode-grid" role="radiogroup" aria-label="Forma de cobrança">
            <button
              type="button"
              className={`choice-card ${caseForm.pricing_mode === "fixed" ? "active" : ""}`}
              aria-pressed={caseForm.pricing_mode === "fixed"}
              onClick={() => syncField("pricing_mode", "fixed")}
            >
              <CreditCard size={18} />
              <strong>Valor fixo</strong>
            </button>
            <button
              type="button"
              className={`choice-card ${caseForm.pricing_mode === "services" ? "active" : ""}`}
              aria-pressed={caseForm.pricing_mode === "services"}
              onClick={() => syncField("pricing_mode", "services")}
            >
              <ListChecks size={18} />
              <strong>Por dente</strong>
            </button>
          </div>
        </div>

        {caseForm.pricing_mode === "fixed" ? (
          <FormField label="Valor total acordado (R$)">
            <input
              name="total_value"
              value={caseForm.total_value}
              onChange={onCaseChange}
              placeholder="0,00"
              required
            />
          </FormField>
        ) : (
          <div className="case-pricing-total" aria-live="polite">
            <small>Total calculado</small>
            <strong>{formatCurrency(totalValue)}</strong>
          </div>
        )}
      </section>

      <section className="case-create-panel case-create-teeth">
        <div className="case-create-heading">
          <h3>Dentes do caso</h3>
          <p>Selecione os dentes envolvidos</p>
        </div>

        <OdontogramSelector selectedTeeth={selectedTeeth} onChange={handleTeethChange} />

        {caseForm.pricing_mode === "services" && selectedTeeth.length > 0 && (
          <div className="tooth-pricing-list">
            {selectedTeeth.map((tooth) => (
              <label key={tooth} className="tooth-pricing-item">
                <span>Dente {tooth}</span>
                <input
                  value={unitValues[tooth] || ""}
                  onChange={(event) => handleUnitValueChange(tooth, event.target.value)}
                  placeholder="R$ 0,00"
                  required
                />
              </label>
            ))}
          </div>
        )}
      </section>

      <aside className="case-create-panel case-create-summary">
        <div className="case-create-heading">
          <h3>Resumo do caso</h3>
        </div>

        <div className="case-summary-box">
          <dl>
            <div>
              <dt>Dentista</dt>
              <dd>{selectedDoctor?.name || "-"}</dd>
            </div>
            <div>
              <dt>Paciente</dt>
              <dd>{caseForm.patient_ref || "-"}</dd>
            </div>
            <div>
              <dt>Prazo</dt>
              <dd>{caseForm.deadline || "-"}</dd>
            </div>
            <div>
              <dt>Cobrança</dt>
              <dd>{caseForm.pricing_mode === "fixed" ? "Valor fixo" : "Por dente"}</dd>
            </div>
            <div>
              <dt>Valor</dt>
              <dd>{formatCurrency(totalValue)}</dd>
            </div>
            <div>
              <dt>Dentes</dt>
              <dd>{selectedTeeth.length ? selectedTeeth.join(", ") : "Nenhum"}</dd>
            </div>
          </dl>
        </div>

        <div className="case-create-submit">
          <Button variant="primary" disabled={busy} type="submit">
            <SubmitIcon size={17} />
            {submitLabel}
          </Button>
        </div>
      </aside>
    </form>
  );
}
