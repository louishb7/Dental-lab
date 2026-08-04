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

const CONTROL_CLASS =
  "min-h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25";

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
    <form className="grid min-h-[min(660px,calc(100vh-2rem))] grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(260px,0.9fr)] gap-2 max-[1120px]:min-h-0 max-[1120px]:grid-cols-1" onSubmit={onSubmit}>
      <section className="grid min-w-0 content-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="text-xs font-extrabold uppercase tracking-[0.05em] text-primary">Informações do caso</div>

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
            placeholder="Paciente ou referência"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
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
          />
        </FormField>

        <div className="grid gap-1.5 text-xs font-bold text-[var(--color-text-muted)]">
          <span>Cobrança</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de cobrança">
            <button
              type="button"
              className={[
                "flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold text-[var(--color-text)]",
                caseForm.pricing_mode === "fixed"
                  ? "border-primary/30 bg-primary/10"
                  : "border-[var(--color-border)] bg-[var(--color-subtle)]",
              ].join(" ")}
              aria-pressed={caseForm.pricing_mode === "fixed"}
              onClick={() => syncField("pricing_mode", "fixed")}
            >
              <CreditCard size={18} />
              <strong>Valor fixo</strong>
            </button>
            <button
              type="button"
              className={[
                "flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold text-[var(--color-text)]",
                caseForm.pricing_mode === "services"
                  ? "border-primary/30 bg-primary/10"
                  : "border-[var(--color-border)] bg-[var(--color-subtle)]",
              ].join(" ")}
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
          <div className="grid min-h-10 content-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] px-3 py-2" aria-live="polite">
            <small className="text-xs font-semibold text-[var(--color-text-muted)]">Total calculado</small>
            <strong className="text-base font-bold text-[var(--color-text)]">{formatCurrency(totalValue)}</strong>
          </div>
        )}
      </section>

      <section className="grid min-w-0 content-start justify-items-center gap-3 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="grid gap-1 justify-self-stretch">
          <h3 className="text-base font-bold text-[var(--color-text)]">Dentes do caso</h3>
          <p className="text-sm text-[var(--color-text-muted)]">Selecione os dentes envolvidos</p>
        </div>

        <OdontogramSelector selectedTeeth={selectedTeeth} onChange={handleTeethChange} />

        {caseForm.pricing_mode === "services" && selectedTeeth.length > 0 && (
          <div className="grid max-h-32 w-full grid-cols-2 gap-2 overflow-auto pr-1 max-[1120px]:grid-cols-1">
            {selectedTeeth.map((tooth) => (
              <label key={tooth} className="grid gap-1 text-xs font-bold text-[var(--color-text-muted)]">
                <span>Dente {tooth}</span>
                <input
                  className={CONTROL_CLASS}
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

      <aside className="grid min-w-0 content-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="grid gap-1">
          <h3 className="text-base font-bold text-[var(--color-text)]">Resumo do caso</h3>
        </div>

        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] p-3">
          <dl className="grid gap-2">
            <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
              <dt className="text-[var(--color-text-muted)]">Dentista</dt>
              <dd className="m-0 text-[var(--color-text)]">{selectedDoctor?.name || "-"}</dd>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
              <dt className="text-[var(--color-text-muted)]">Paciente</dt>
              <dd className="m-0 text-[var(--color-text)]">{caseForm.patient_ref || "-"}</dd>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
              <dt className="text-[var(--color-text-muted)]">Prazo</dt>
              <dd className="m-0 text-[var(--color-text)]">{caseForm.deadline || "-"}</dd>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
              <dt className="text-[var(--color-text-muted)]">Cobrança</dt>
              <dd className="m-0 text-[var(--color-text)]">{caseForm.pricing_mode === "fixed" ? "Valor fixo" : "Por dente"}</dd>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
              <dt className="text-[var(--color-text-muted)]">Valor</dt>
              <dd className="m-0 text-[var(--color-text)]">{formatCurrency(totalValue)}</dd>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
              <dt className="text-[var(--color-text-muted)]">Dentes</dt>
              <dd className="m-0 text-[var(--color-text)]">{selectedTeeth.length ? selectedTeeth.join(", ") : "Nenhum"}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-3 flex">
          <Button variant="primary" disabled={busy} type="submit">
            <SubmitIcon size={17} />
            {submitLabel}
          </Button>
        </div>
      </aside>
    </form>
  );
}
