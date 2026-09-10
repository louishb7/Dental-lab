import { ArrowUpRight, Edit3, Phone, Plus, Stethoscope, Trash2 } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import ActionsMenu from "../components/ui/ActionsMenu.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import FormField from "../components/ui/FormField.jsx";
import Modal from "../components/ui/Modal.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";

export default function DoctorsPage({
  doctors,
  loading,
  busy,
  doctorForm,
  editingDoctorId,
  showDoctorModal,
  setShowDoctorModal,
  onNewDoctor,
  onEditDoctor,
  onDoctorChange,
  onDoctorSubmit,
  onOpenDoctorCases,
  onRemoveDoctor,
}) {
  return (
    <PageContainer
      width="medium"
      kicker="Dentistas"
      title="Seus dentistas"
      description={`${doctors.length} ${doctors.length === 1 ? "profissional cadastrado" : "profissionais cadastrados"}`}
      action={
        <Button variant="primary" onClick={onNewDoctor}>
          <Plus size={18} />
          Novo dentista
        </Button>
      }
    >
      <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {loading ? (
          <LoadingState message="Carregando dentistas..." />
        ) : !doctors.length ? (
          <EmptyState
            icon={Stethoscope}
            title="Nenhum dentista cadastrado."
            description="Cadastre um dentista para vincular casos."
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {doctors.map((doctor) => (
              <article
                key={doctor.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:p-5"
              >
                <div className="min-w-0">
                  <h2 className="break-words text-sm font-semibold">{doctor.name}</h2>
                  <p className="mt-1 break-words text-sm text-[var(--color-text-muted)]">
                    {doctor.clinic_name || "Clínica não informada"}
                  </p>
                  {doctor.phone && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <Phone size={13} />
                      {doctor.phone}
                    </p>
                  )}
                  {doctor.notes && (
                    <details className="mt-1 text-xs text-[var(--color-text-muted)]">
                      <summary className="w-fit py-2 underline-offset-4 hover:underline">Observações</summary>
                      <p className="max-w-prose whitespace-pre-wrap break-words py-2">{doctor.notes}</p>
                    </details>
                  )}
                </div>
                <div className="col-span-2 row-start-2 justify-self-end sm:col-span-1 sm:col-start-2 sm:row-start-1">
                  <Button variant="secondary" size="sm" onClick={() => onOpenDoctorCases(doctor.id)}>
                    {doctor.cases_count ?? 0} casos ativos
                    <ArrowUpRight size={15} />
                  </Button>
                </div>
                <div className="col-start-2 row-start-1 self-start sm:col-start-3 sm:self-center">
                  <ActionsMenu
                    label={`Ações de ${doctor.name}`}
                    items={[
                      { label: "Editar dentista", icon: Edit3, onSelect: () => onEditDoctor(doctor) },
                      {
                        label: "Excluir dentista",
                        icon: Trash2,
                        danger: true,
                        onSelect: () => onRemoveDoctor(doctor.id),
                      },
                    ]}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showDoctorModal && (
        <Modal
          className="max-w-[480px]"
          title={editingDoctorId ? "Editar dentista" : "Novo dentista"}
          description={
            editingDoctorId
              ? "Atualize os dados do dentista."
              : "Cadastre o dentista para vincular novos casos."
          }
          onClose={() => setShowDoctorModal(false)}
        >
          <form className="grid gap-3" onSubmit={onDoctorSubmit}>
            <FormField label="Nome">
              <input
                name="name"
                value={doctorForm.name}
                onChange={onDoctorChange}
                placeholder="Dra. Ana Martins"
                required
              />
            </FormField>
            <FormField label="Clínica">
              <input
                name="clinic_name"
                value={doctorForm.clinic_name}
                onChange={onDoctorChange}
                placeholder="Clínica Sorriso"
              />
            </FormField>
            <FormField label="Telefone">
              <input
                name="phone"
                inputMode="tel"
                value={doctorForm.phone}
                onChange={onDoctorChange}
                placeholder="(81)99999-9999"
              />
            </FormField>
            <FormField label="Observações">
              <textarea
                name="notes"
                rows="4"
                value={doctorForm.notes}
                onChange={onDoctorChange}
                placeholder="Contato, preferências ou observações úteis"
              />
            </FormField>
            <Button variant="primary" disabled={busy} type="submit">
              <Plus size={18} />
              {editingDoctorId ? "Salvar alterações" : "Cadastrar dentista"}
            </Button>
          </form>
        </Modal>
      )}
    </PageContainer>
  );
}
