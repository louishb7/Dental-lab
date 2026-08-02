import { Edit3, Eye, Plus, Stethoscope, Trash2 } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import DataTable from "../components/ui/DataTable.jsx";
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
  const columns = [
    {
      key: "name",
      header: "Nome",
      render: (doctor) => (
        <span className="grid min-w-0 gap-1">
          <strong className="truncate text-sm font-bold text-[#f3f4f6]">{doctor.name}</strong>
          {doctor.notes && <small className="truncate text-xs text-[#aeb7c2]">{doctor.notes}</small>}
        </span>
      ),
    },
    { key: "clinic_name", header: "Clínica", render: (doctor) => doctor.clinic_name || "-" },
    { key: "phone", header: "Telefone", render: (doctor) => doctor.phone || "-" },
    { key: "cases_count", header: "Casos ativos", render: (doctor) => doctor.cases_count ?? 0 },
    {
      key: "actions",
      header: "Ações",
      render: (doctor) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="secondary"
            iconOnly
            aria-label="Ver casos"
            onClick={() => onOpenDoctorCases(doctor.id)}
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            iconOnly
            aria-label="Editar dentista"
            onClick={() => onEditDoctor(doctor)}
          >
            <Edit3 size={16} />
          </Button>
          <Button
            variant="danger"
            iconOnly
            aria-label="Excluir dentista"
            onClick={() => onRemoveDoctor(doctor.id)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      kicker="Dentistas"
      title="Dentistas"
      description="Cadastre e consulte os dentistas vinculados aos casos."
      action={
        <Button variant="primary" onClick={onNewDoctor}>
          <Plus size={18} />
          Novo dentista
        </Button>
      }
    >
      <div className="grid gap-4">
        <section className="rounded-md border border-[rgba(255,138,42,0.3)] bg-[rgba(25,30,38,0.96)] p-4 text-[#f3f4f6] shadow-sm">
            <DataTable
              columns={columns}
              data={doctors}
              loading={loading}
              emptyIcon={Stethoscope}
              emptyTitle="Nenhum dentista cadastrado."
              emptyDescription="Cadastre um dentista para vincular casos."
            />
        </section>
      </div>

      {showDoctorModal && (
        <Modal
          title={editingDoctorId ? "Editar dentista" : "Novo dentista"}
          description={editingDoctorId ? "Atualize os dados do dentista." : "Cadastre o dentista para vincular novos casos."}
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
