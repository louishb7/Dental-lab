import { FilePlus2 } from "lucide-react";
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
  const SubmitIcon = submitIcon;
  const selectedTeeth = sortTeethByFdi(caseForm.selected_teeth);
  const unitValues = caseForm.unit_values || {};
  const selectedTeethSummary = selectedTeeth.length
    ? `Dentes selecionados: ${selectedTeeth.join(", ")}`
    : "Nenhum dente selecionado.";
  const unitTotal = selectedTeeth.reduce(
    (sum, tooth) => sum + (parseCurrencyToNumber(unitValues[tooth]) || 0),
    0,
  );

  function selectPricingMode(mode) {
    onCaseChange({ target: { name: "pricing_mode", value: mode } });
  }

  function syncCaseField(name, value) {
    onCaseChange({ target: { name, value } });
  }

  function handleTeethChange(nextTeeth) {
    const nextUnitValues = nextTeeth.reduce((accumulator, tooth) => {
      accumulator[tooth] = unitValues[tooth] || "";
      return accumulator;
    }, {});

    syncCaseField("selected_teeth", nextTeeth);
    syncCaseField("unit_values", nextUnitValues);
  }

  function handleUnitValueChange(tooth, value) {
    syncCaseField("unit_values", {
      ...unitValues,
      [tooth]: formatCurrencyInput(value),
    });
  }

  return (
    <form className={`form-grid case-intake-form ${layout}`} onSubmit={onSubmit}>
      <div className="form-section simple-form-section">
        <div className="panel-title">
          <h3>Novo caso</h3>
          <p>Dados essenciais para abrir o trabalho.</p>
        </div>
        <div className="form-row">
          <FormField label="Dentista">
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
          <FormField label="Prazo">
            <input name="deadline" type="date" value={caseForm.deadline} onChange={onCaseChange} />
          </FormField>
        </div>

        <FormField label="Nome do paciente">
          <input
            name="patient_ref"
            value={caseForm.patient_ref}
            onChange={onCaseChange}
            placeholder="Paciente, referência ou código interno"
            required
          />
        </FormField>

        <div className="form-row">
          <FormField label="Urgência">
            <select name="priority" value={caseForm.priority} onChange={onCaseChange}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgente</option>
            </select>
          </FormField>
          <div className="form-field">
            <span>Forma de cobrança</span>
            <div className="pricing-mode-grid" role="radiogroup" aria-label="Forma de cobrança">
              <button
                type="button"
                className={`choice-card ${caseForm.pricing_mode === "fixed" ? "active" : ""}`}
                aria-pressed={caseForm.pricing_mode === "fixed"}
                onClick={() => selectPricingMode("fixed")}
              >
                <strong>Valor fixo acertado</strong>
                <small>Informe o valor total combinado do caso.</small>
              </button>
              <button
                type="button"
                className={`choice-card ${caseForm.pricing_mode === "services" ? "active" : ""}`}
                aria-pressed={caseForm.pricing_mode === "services"}
                onClick={() => selectPricingMode("services")}
              >
                <strong>Cobrança unitária</strong>
                <small>Some os serviços e valores por dente ou item.</small>
              </button>
            </div>
          </div>
        </div>

        <div className="form-row">
          <FormField label="Serviço principal">
            <input
              name="service_name"
              value={caseForm.service_name}
              onChange={onCaseChange}
              placeholder="Coroa, faceta, provisório, placa..."
            />
          </FormField>
          {caseForm.pricing_mode === "fixed" ? (
            <FormField label="Valor total acordado">
              <input
                name="total_value"
                value={caseForm.total_value}
                onChange={onCaseChange}
                placeholder="R$ 0,00"
                required
              />
            </FormField>
          ) : (
            <div className="case-pricing-total" aria-live="polite">
              <small>Total visual</small>
              <strong>{formatCurrency(unitTotal)}</strong>
              <span>Somado a partir dos dentes selecionados.</span>
            </div>
          )}
        </div>

        <div className="case-teeth-section">
          <div className="case-teeth-header">
            <div>
              <h4>Dentes do caso</h4>
            </div>
            <span className="case-teeth-summary">{selectedTeethSummary}</span>
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
        </div>

        <FormField label="Observações">
          <textarea
            name="notes"
            rows="4"
            value={caseForm.notes}
            onChange={onCaseChange}
            placeholder="Use para dentes, detalhes rápidos, observações ou combinações do caso"
          />
        </FormField>
        <p className="case-pricing-note">
          {caseForm.pricing_mode === "fixed"
            ? "No valor fixo, os dentes selecionados ficam registrados como referência operacional do caso."
            : selectedTeeth.length
              ? "Na cobrança unitária, cada dente selecionado gera um item automático com o valor informado."
              : "Na cobrança unitária, selecione dentes para gerar as unidades automaticamente ou complemente depois."}
        </p>
      </div>

      <div className="form-actions-row">
        <Button variant="primary" disabled={busy} type="submit">
          <SubmitIcon size={18} />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
