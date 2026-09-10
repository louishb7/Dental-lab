import { CreditCard, FilePlus2, ListChecks } from "lucide-react";
import OdontogramSelector from "./OdontogramSelector.jsx";
import Button from "../ui/Button.jsx";
import FormField from "../ui/FormField.jsx";
import {
  formatCurrency,
  formatCurrencyInput,
  formatDate,
  parseCurrencyToNumber,
} from "../../utils/formatters.js";
import { sortTeethByFdi } from "../../utils/odontogram.js";

const CONTROL_CLASS =
  "min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25";

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
}) {
  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId);
  const SubmitIcon = submitIcon;
  const selectedTeeth = sortTeethByFdi(caseForm.selected_teeth);
  const unitValues = caseForm.unit_values || {};
  const unitTotal = selectedTeeth.reduce(
    (sum, tooth) => sum + (parseCurrencyToNumber(unitValues[tooth]) || 0),
    0,
  );
  const totalValue =
    caseForm.pricing_mode === "fixed" ? parseCurrencyToNumber(caseForm.total_value) || 0 : unitTotal;

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
    <form className="grid gap-5" onSubmit={onSubmit}>
      <section
        className="grid gap-4 border-b border-[var(--color-border)] pb-5"
        aria-labelledby="intake-identification"
      >
        <h3 id="intake-identification" className="text-sm font-semibold">
          <span className="mr-2 text-xs tabular-nums text-primary">01</span>Identificação do trabalho
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_0.8fr]">
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
        </div>
      </section>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <section className="min-w-0" aria-labelledby="intake-teeth">
          <h3 id="intake-teeth" className="text-sm font-semibold">
            <span className="mr-2 text-xs tabular-nums text-primary">02</span>Dentes do trabalho
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Selecione os dentes envolvidos no odontograma.
          </p>
          <div className="mx-auto w-full max-w-[460px] pt-5 [&_g[role=button]:focus-visible]:drop-shadow-[0_0_3px_var(--color-primary)] [&>div]:gap-5">
            <OdontogramSelector selectedTeeth={selectedTeeth} onChange={handleTeethChange} />
          </div>
        </section>
        <section
          className="grid min-w-0 gap-4 border-t border-[var(--color-border)] pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
          aria-labelledby="intake-pricing"
        >
          <h3 id="intake-pricing" className="text-sm font-semibold">
            <span className="mr-2 text-xs tabular-nums text-primary">03</span>Valores e observações
          </h3>
          <div className="grid gap-2">
            <span className="text-xs font-bold text-[var(--color-text-muted)]">Forma de cobrança</span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Forma de cobrança">
              <button
                type="button"
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium ${caseForm.pricing_mode === "fixed" ? "border-primary/40 bg-primary/8 text-primary" : "border-[var(--color-border)] text-[var(--color-text-soft)]"}`}
                aria-pressed={caseForm.pricing_mode === "fixed"}
                onClick={() => syncField("pricing_mode", "fixed")}
              >
                <CreditCard size={16} />
                Valor fixo
              </button>
              <button
                type="button"
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium ${caseForm.pricing_mode === "services" ? "border-primary/40 bg-primary/8 text-primary" : "border-[var(--color-border)] text-[var(--color-text-soft)]"}`}
                aria-pressed={caseForm.pricing_mode === "services"}
                onClick={() => syncField("pricing_mode", "services")}
              >
                <ListChecks size={16} />
                Por dente
              </button>
            </div>
          </div>
          {caseForm.pricing_mode === "fixed" ? (
            <FormField label="Valor total acordado (R$)">
              <input
                name="total_value"
                inputMode="decimal"
                value={caseForm.total_value}
                onChange={onCaseChange}
                placeholder="0,00"
                required
              />
            </FormField>
          ) : (
            <div className="grid gap-3">
              {selectedTeeth.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {selectedTeeth.map((tooth) => (
                    <label
                      key={tooth}
                      className="grid gap-1 text-xs font-bold text-[var(--color-text-muted)]"
                    >
                      <span>Dente {tooth}</span>
                      <input
                        className={CONTROL_CLASS}
                        inputMode="decimal"
                        value={unitValues[tooth] || ""}
                        onChange={(event) => handleUnitValueChange(tooth, event.target.value)}
                        placeholder="R$ 0,00"
                        required
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-md bg-[var(--color-surface-soft)] p-3 text-xs text-[var(--color-text-muted)]">
                  Selecione os dentes para informar o valor de cada serviço.
                </p>
              )}
              <p className="flex justify-between gap-2 text-sm" aria-live="polite">
                <span className="text-[var(--color-text-muted)]">Total calculado</span>
                <strong className="tabular-nums">{formatCurrency(totalValue)}</strong>
              </p>
            </div>
          )}
          <FormField label="Observações">
            <textarea name="notes" rows="3" value={caseForm.notes} onChange={onCaseChange} />
          </FormField>
          <section className="border-t border-[var(--color-border)] pt-4">
            <h3 className="mb-3 text-sm font-semibold">Conferência do caso</h3>
            <dl className="grid gap-2 text-xs [&>div]:grid [&>div]:grid-cols-[72px_minmax(0,1fr)] [&>div]:gap-3 [&_dt]:text-[var(--color-text-muted)] [&_dd]:break-words">
              <div>
                <dt>Dentista</dt>
                <dd>{selectedDoctor?.name || "A selecionar"}</dd>
              </div>
              <div>
                <dt>Paciente</dt>
                <dd>{caseForm.patient_ref || "A preencher"}</dd>
              </div>
              <div>
                <dt>Prazo</dt>
                <dd>{caseForm.deadline ? formatDate(caseForm.deadline + "T12:00:00") : "Sem prazo"}</dd>
              </div>
              <div>
                <dt>Cobrança</dt>
                <dd>{caseForm.pricing_mode === "fixed" ? "Valor fixo" : "Por dente"}</dd>
              </div>
              <div>
                <dt>Dentes</dt>
                <dd>{selectedTeeth.length ? selectedTeeth.join(", ") : "Nenhum selecionado"}</dd>
              </div>
            </dl>
          </section>
        </section>
      </div>
      <footer className="sticky -bottom-4 z-10 -mx-4 -mb-4 flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
        <div>
          <span className="text-xs text-[var(--color-text-muted)]">Total do caso</span>
          <strong className="block text-lg font-semibold tabular-nums">{formatCurrency(totalValue)}</strong>
        </div>
        <Button variant="primary" disabled={busy} type="submit">
          <SubmitIcon size={17} />
          {submitLabel}
        </Button>
      </footer>
    </form>
  );
}
