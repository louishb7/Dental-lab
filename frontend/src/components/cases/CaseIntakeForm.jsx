import { FilePlus2 } from "lucide-react";
import Button from "../ui/Button.jsx";
import FormField from "../ui/FormField.jsx";

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

  return (
    <form className={`form-grid case-intake-form ${layout}`} onSubmit={onSubmit}>
      <div className="form-section simple-form-section">
        <div className="panel-title">
          <h3>Novo caso</h3>
          <p>Preencha só o necessário para começar a organizar o trabalho.</p>
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
          <FormField label="Cobrança">
            <select name="pricing_mode" value={caseForm.pricing_mode} onChange={onCaseChange}>
              <option value="services">Somar itens</option>
              <option value="fixed">Valor fechado</option>
            </select>
          </FormField>
        </div>

        {caseForm.pricing_mode === "fixed" && (
          <FormField label="Valor do caso">
            <input
              name="total_value"
              value={caseForm.total_value}
              onChange={onCaseChange}
              placeholder="R$ 0,00"
              required
            />
          </FormField>
        )}

        <FormField label="Observações">
          <textarea
            name="notes"
            rows="4"
            value={caseForm.notes}
            onChange={onCaseChange}
            placeholder="Use para dentes, detalhes rápidos, observações ou combinações do caso"
          />
        </FormField>
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
