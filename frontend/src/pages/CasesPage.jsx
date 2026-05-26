import { Eye, Layers3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import FormField from "../components/ui/FormField.jsx";
import Modal from "../components/ui/Modal.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency, formatDeadline, getDeadlineTone } from "../utils/formatters.js";
import CaseDetailsPage from "./CaseDetailsPage.jsx";

export default function CasesPage({
  cases,
  doctors,
  items,
  loading,
  busy,
  message,
  caseForm,
  itemForm,
  caseAdvanced,
  itemAdvanced,
  selectedCase,
  showCaseModal,
  setShowCaseModal,
  setCaseAdvanced,
  setItemAdvanced,
  selectedDoctorId,
  setSelectedDoctorId,
  onCaseChange,
  onCaseSubmit,
  onItemChange,
  onItemSubmit,
  onOpenCaseItems,
  onAdvanceCase,
  onRemoveCase,
  onRemoveItem,
  onCloseDetails,
}) {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    doctorId: selectedDoctorId ? String(selectedDoctorId) : "",
  });

  function clearFilters() {
    setFilters({ search: "", status: "", priority: "", doctorId: "" });
    setSelectedDoctorId(null);
  }

  useEffect(() => {
    if (!selectedDoctorId) return;

    setFilters((current) => ({ ...current, doctorId: String(selectedDoctorId) }));
  }, [selectedDoctorId]);

  const doctorById = useMemo(
    () => new Map(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors],
  );

  const filteredCases = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return cases.filter((caseItem) => {
      const doctor = doctorById.get(caseItem.doctor_id);
      const matchesSearch = !search
        || caseItem.patient_ref?.toLowerCase().includes(search)
        || String(caseItem.id).includes(search)
        || doctor?.name?.toLowerCase().includes(search);
      const matchesStatus = !filters.status || caseItem.status === filters.status;
      const matchesPriority = !filters.priority || caseItem.priority === filters.priority;
      const matchesDoctor = !filters.doctorId || caseItem.doctor_id === Number(filters.doctorId);

      return matchesSearch && matchesStatus && matchesPriority && matchesDoctor;
    });
  }, [cases, doctorById, filters]);

  const columns = [
    {
      key: "patient_ref",
      header: "Caso / Referência",
      render: (caseItem) => (
        <span className="cell-main">
          <strong>#{caseItem.id} · {caseItem.patient_ref}</strong>
          {caseItem.notes && <small>{caseItem.notes}</small>}
        </span>
      ),
    },
    {
      key: "doctor",
      header: "Dentista",
      render: (caseItem) => doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`,
    },
    {
      key: "deadline",
      header: "Prazo",
      render: (caseItem) => {
        const tone = getDeadlineTone(caseItem.deadline, caseItem.status);
        return <span className={`deadline-${tone}`}>{formatDeadline(caseItem.deadline, caseItem.status)}</span>;
      },
    },
    { key: "status", header: "Status", render: (caseItem) => <StatusBadge status={caseItem.status} /> },
    { key: "priority", header: "Prioridade", render: (caseItem) => <PriorityBadge priority={caseItem.priority} /> },
    { key: "total_value", header: "Valor", render: (caseItem) => formatCurrency(caseItem.total_value) },
    { key: "items", header: "Itens", render: (caseItem) => caseItem.items_count ?? caseItem.items?.length ?? 0 },
    {
      key: "actions",
      header: "Ações",
      render: (caseItem) => (
        <div className="row-actions">
          <Button variant="secondary" iconOnly aria-label="Abrir detalhes" onClick={() => onOpenCaseItems(caseItem.id)}>
            <Eye size={16} />
          </Button>
          {caseItem.status !== "delivered" && (
            <Button variant="ghost" iconOnly aria-label="Avançar status" onClick={() => onAdvanceCase(caseItem)}>
              <RefreshCw size={16} />
            </Button>
          )}
          <Button variant="danger" iconOnly aria-label="Excluir caso" onClick={() => onRemoveCase(caseItem.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      kicker="Produção"
      title="Casos"
      description="Controle seus prazos, prioridades e entregas."
      action={
        <Button variant="primary" onClick={() => setShowCaseModal(true)}>
          <Plus size={18} />
          Novo caso
        </Button>
      }
    >
      <div className="content-grid">
        {message && <p className={`feedback ${message.type}`}>{message.text}</p>}

        <div className="filter-bar">
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Buscar por caso, paciente ou dentista"
            aria-label="Buscar casos"
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="completed">Pronto</option>
            <option value="delivered">Entregue</option>
          </select>
          <select
            value={filters.priority}
            onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
            aria-label="Filtrar por prioridade"
          >
            <option value="">Todas prioridades</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgente</option>
          </select>
          <select
            value={filters.doctorId}
            onChange={(event) => setFilters((current) => ({ ...current, doctorId: event.target.value }))}
            aria-label="Filtrar por dentista"
          >
            <option value="">Todos dentistas</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar
          </Button>
        </div>

        <section className="panel panel-strong">
          <div className="panel-body">
            <DataTable
              columns={columns}
              data={filteredCases}
              loading={loading}
              emptyIcon={Layers3}
              emptyTitle="Nenhum caso cadastrado."
              emptyDescription="Crie o primeiro caso para começar a acompanhar sua produção."
            />
          </div>
        </section>
      </div>

      {showCaseModal && (
        <Modal
          title="Novo caso"
          description="Registre o caso recebido e vincule ao dentista responsável."
          onClose={() => setShowCaseModal(false)}
        >
          <form className="form-grid" onSubmit={onCaseSubmit}>
            <div className="form-section">
              <h3>Informações principais</h3>
              <FormField label="Dentista">
                <select
                  value={selectedDoctorId || ""}
                  onChange={(event) => setSelectedDoctorId(Number(event.target.value) || null)}
                  required
                >
                  <option value="">Selecione um dentista</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Referência/paciente">
                <input
                  name="patient_ref"
                  value={caseForm.patient_ref}
                  onChange={onCaseChange}
                  placeholder="Paciente ou código"
                  required
                />
              </FormField>
              <div className="form-row">
                <FormField label="Prazo">
                  <input name="deadline" type="date" value={caseForm.deadline} onChange={onCaseChange} />
                </FormField>
                <FormField label="Prioridade">
                  <select name="priority" value={caseForm.priority} onChange={onCaseChange}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </FormField>
              </div>
            </div>

            <div className="form-section">
              <div className="case-card-top">
                <h3>Financeiro</h3>
                <Button variant="ghost" size="sm" onClick={() => setCaseAdvanced((value) => !value)}>
                  {caseAdvanced ? "Simples" : "Avançado"}
                </Button>
              </div>
              <FormField label="Modo de precificação">
                <select name="pricing_mode" value={caseForm.pricing_mode} onChange={onCaseChange}>
                  <option value="services">Por serviços</option>
                  <option value="fixed">Valor fixo</option>
                </select>
              </FormField>
              {caseForm.pricing_mode === "fixed" && (
                <FormField label="Valor fixo">
                  <input
                    name="total_value"
                    value={caseForm.total_value}
                    onChange={onCaseChange}
                    placeholder="350,00"
                    required
                  />
                </FormField>
              )}
            </div>

            {caseAdvanced && (
              <div className="form-section">
                <h3>Observações</h3>
                <FormField label="Observações gerais">
                  <textarea name="notes" rows="4" value={caseForm.notes} onChange={onCaseChange} />
                </FormField>
              </div>
            )}

            <Button variant="primary" disabled={busy} type="submit">
              <Plus size={18} />
              Criar caso
            </Button>
          </form>
        </Modal>
      )}

      {selectedCase && (
        <CaseDetailsPage
          caseItem={selectedCase}
          doctor={doctorById.get(selectedCase.doctor_id)}
          items={items}
          itemForm={itemForm}
          itemAdvanced={itemAdvanced}
          setItemAdvanced={setItemAdvanced}
          busy={busy}
          onItemChange={onItemChange}
          onItemSubmit={onItemSubmit}
          onRemoveItem={onRemoveItem}
          onClose={onCloseDetails}
        />
      )}
    </PageContainer>
  );
}
