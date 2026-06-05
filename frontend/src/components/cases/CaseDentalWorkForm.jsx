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

/**
 * Renders the shared odontogram, billing and value summary used by case intake
 * and by service creation inside an existing case.
 */
export default function CaseDentalWorkForm({
  form,
  busy,
  submitLabel = "Salvar",
  submitIcon = FilePlus2,
  allowPricingModeChange = true,
  showFixedValueInput = true,
  showServiceName = false,
  showNotes = false,
  title = "Dentes do caso",
  subtitle = "Selecione os dentes envolvidos",
  summaryTitle = "Resumo",
  summaryRows = [],
  fixedModeLabel = "Valor fixo",
  unitModeLabel = "Por unidade",
  fixedValueLabel = "Valor total acordado (R$)",
  fixedValueHint = "O valor do caso permanece fixo.",
  unitValueHint = "Informe o valor por dente selecionado.",
  onChange,
  onSubmit,
  onCancel,
}) {
  const SubmitIcon = submitIcon;
  const selectedTeeth = sortTeethByFdi(form.selected_teeth);
  const unitValues = form.unit_values || {};
  const unitTotal = selectedTeeth.reduce(
    (sum, tooth) => sum + (parseCurrencyToNumber(unitValues[tooth]) || 0),
    0,
  );
  const totalValue = form.pricing_mode === "fixed"
    ? parseCurrencyToNumber(form.total_value) || 0
    : unitTotal;
  const billingLabel = form.pricing_mode === "fixed" ? fixedModeLabel : unitModeLabel;

  function syncField(name, value) {
    onChange({ target: { name, value } });
  }

  function selectPricingMode(mode) {
    syncField("pricing_mode", mode);
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
    <>
      <section className="case-create-panel case-create-work">
        {showServiceName && (
          <FormField label="Serviço">
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Coroa, faceta, placa, provisório..."
              required
            />
          </FormField>
        )}

        <div className="form-field">
          <span>Tipo de cobrança</span>
          <div className="pricing-mode-grid" role="radiogroup" aria-label="Forma de cobrança">
            <button
              type="button"
              className={`choice-card ${form.pricing_mode === "fixed" ? "active" : ""}`}
              aria-pressed={form.pricing_mode === "fixed"}
              disabled={!allowPricingModeChange}
              onClick={() => allowPricingModeChange && selectPricingMode("fixed")}
            >
              <CreditCard size={18} />
              <strong>{fixedModeLabel}</strong>
            </button>
            <button
              type="button"
              className={`choice-card ${form.pricing_mode === "services" ? "active" : ""}`}
              aria-pressed={form.pricing_mode === "services"}
              disabled={!allowPricingModeChange}
              onClick={() => allowPricingModeChange && selectPricingMode("services")}
            >
              <ListChecks size={18} />
              <strong>{unitModeLabel}</strong>
            </button>
          </div>
        </div>

        {form.pricing_mode === "fixed" && showFixedValueInput ? (
          <FormField label={fixedValueLabel}>
            <input
              name="total_value"
              value={form.total_value}
              onChange={onChange}
              placeholder="0,00"
              required
            />
          </FormField>
        ) : (
          <div className="case-pricing-total" aria-live="polite">
            <small>{form.pricing_mode === "fixed" ? fixedValueHint : unitValueHint}</small>
            <strong>{formatCurrency(totalValue)}</strong>
          </div>
        )}

        {showNotes && (
          <FormField label="Observações">
            <textarea
              name="notes"
              rows="4"
              value={form.notes}
              onChange={onChange}
              placeholder="Use este campo para anotar detalhes rápidos do trabalho."
            />
          </FormField>
        )}
      </section>

      <section className="case-create-panel case-create-teeth">
        <div className="case-create-heading">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <OdontogramSelector selectedTeeth={selectedTeeth} onChange={handleTeethChange} />

        {form.pricing_mode === "services" && selectedTeeth.length > 0 && (
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
          <h3>{summaryTitle}</h3>
        </div>

        <div className="case-summary-box">
          <dl>
            {summaryRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value || "-"}</dd>
              </div>
            ))}
            <div>
              <dt>Cobrança</dt>
              <dd>{billingLabel}</dd>
            </div>
            <div>
              <dt>Valor</dt>
              <dd>{formatCurrency(totalValue)}</dd>
            </div>
            <div>
              <dt>Dentes</dt>
              <dd>{selectedTeeth.length ? `${selectedTeeth.length} selecionados` : "Nenhum"}</dd>
            </div>
          </dl>
        </div>

        <div className="case-create-submit">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button variant="primary" disabled={busy} type="submit" onClick={onSubmit}>
            <SubmitIcon size={17} />
            {submitLabel}
          </Button>
        </div>
      </aside>
    </>
  );
}
