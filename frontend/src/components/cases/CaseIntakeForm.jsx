import { FilePlus2 } from "lucide-react";
import CaseDentalWorkForm from "./CaseDentalWorkForm.jsx";
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
  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId);

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
      </section>

      <CaseDentalWorkForm
        form={caseForm}
        busy={busy}
        submitLabel={submitLabel}
        submitIcon={submitIcon}
        summaryTitle="Resumo do caso"
        title="Dentes do caso"
        subtitle="Selecione os dentes envolvidos"
        unitValueHint="Total calculado"
        onChange={onCaseChange}
        summaryRows={[
          { label: "Dentista", value: selectedDoctor?.name },
          { label: "Paciente", value: caseForm.patient_ref },
          { label: "Prazo", value: caseForm.deadline },
        ]}
      />
    </form>
  );
}
