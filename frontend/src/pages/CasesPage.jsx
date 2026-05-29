import { Eye, Layers3, PackageCheck, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CaseIntakeForm from "../components/cases/CaseIntakeForm.jsx";
import Button from "../components/ui/Button.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Modal from "../components/ui/Modal.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import CaseDetailsPage from "./CaseDetailsPage.jsx";

function formatCaseCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getServiceCount(caseItem) {
  return caseItem.items_count ?? caseItem.items?.length ?? 0;
}

export default function CasesPage({
  cases,
  doctors,
  items,
  loading,
  busy,
  caseForm,
  itemForm,
  selectedCase,
  showCaseModal,
  setShowCaseModal,
  selectedDoctorId,
  setSelectedDoctorId,
  onCaseChange,
  onCaseSubmit,
  onItemChange,
  onItemSubmit,
  onOpenCaseItems,
  onAdvanceCase,
  onBulkDeliverCases,
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
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState([]);
  const lastReadyCaseIdsRef = useRef(new Set());

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

  const openCases = filteredCases.filter((caseItem) => caseItem.status !== "delivered");
  const historyCases = filteredCases.filter((caseItem) => caseItem.status === "delivered");
  const readyCases = openCases.filter((caseItem) => caseItem.status === "completed");

  useEffect(() => {
    if (!showDeliverModal) {
      lastReadyCaseIdsRef.current = new Set();
      return;
    }

    setSelectedDeliveryIds((current) => {
      const currentSet = new Set(current);
      let changed = false;

      readyCases.forEach((caseItem) => {
        if (!lastReadyCaseIdsRef.current.has(caseItem.id) && !currentSet.has(caseItem.id)) {
          currentSet.add(caseItem.id);
          changed = true;
        }
      });

      return changed ? Array.from(currentSet) : current;
    });
    lastReadyCaseIdsRef.current = new Set(readyCases.map((caseItem) => caseItem.id));
  }, [readyCases, showDeliverModal]);

  function openDeliverModal() {
    setSelectedDeliveryIds(readyCases.map((caseItem) => caseItem.id));
    setShowDeliverModal(true);
  }

  function toggleDeliverySelection(caseId) {
    setSelectedDeliveryIds((current) =>
      current.includes(caseId)
        ? current.filter((itemId) => itemId !== caseId)
        : [...current, caseId],
    );
  }

  async function handleDeliverSubmit(event) {
    event.preventDefault();
    const ok = await onBulkDeliverCases(selectedDeliveryIds);
    if (ok) {
      setShowDeliverModal(false);
      setSelectedDeliveryIds([]);
    }
  }

  const openColumns = [
    {
      key: "patient_ref",
      header: "Caso / Referência",
      render: (caseItem) => (
        <span className="cell-main">
          <strong>{caseItem.patient_ref}</strong>
          <small>{doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`}</small>
        </span>
      ),
    },
    {
      key: "services",
      header: "Serviços",
      render: (caseItem) => {
        const serviceCount = getServiceCount(caseItem);
        return (
          <span className="cell-main">
            <strong>{formatCaseCount(serviceCount, "item", "itens")}</strong>
            <small>Abra o caso para lançar os trabalhos</small>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenCaseItems(caseItem.id)}
            >
              <Plus size={14} />
              Adicionar serviço
            </Button>
          </span>
        );
      },
    },
    {
      key: "deadline",
      header: "Prazo",
      render: (caseItem) => (
        <span className="cell-main">
          <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
        </span>
      ),
    },
    { key: "status", header: "Status", render: (caseItem) => <StatusBadge status={caseItem.status} /> },
    { key: "priority", header: "Prioridade", render: (caseItem) => <PriorityBadge priority={caseItem.priority} /> },
    { key: "total_value", header: "Valor", render: (caseItem) => formatCurrency(caseItem.total_value) },
    {
      key: "actions",
      header: "Ações",
      render: (caseItem) => (
        <div className="row-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenCaseItems(caseItem.id)}
          >
            Exibir detalhes
          </Button>
          <Button variant="danger" iconOnly aria-label="Excluir caso" onClick={() => onRemoveCase(caseItem.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
    {
      key: "ready",
      header: "Pronto",
      render: (caseItem) =>
        caseItem.status === "pending" ? (
          <div className="ready-cell">
            <Button
              className="vertical-ready-button"
              variant="success"
              aria-label="Marcar como pronto"
              title="Marcar como pronto"
              onClick={() => onAdvanceCase(caseItem)}
            >
              Pronto
            </Button>
          </div>
        ) : (
          <div className="ready-cell">
            <span className="vertical-ready-label" aria-label="Pedido pronto para entrega">
              Pronto
            </span>
          </div>
        ),
    },
  ];

  const historyColumns = [
    {
      key: "patient_ref",
      header: "Caso / Referência",
      render: (caseItem) => (
        <span className="cell-main">
          <strong>{caseItem.patient_ref}</strong>
          <small>{doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`}</small>
        </span>
      ),
    },
    {
      key: "services",
      header: "Serviços",
      render: (caseItem) => (
        <span className="cell-main">
          <strong>{formatCaseCount(getServiceCount(caseItem), "item", "itens")}</strong>
          <small>Histórico de entrega</small>
        </span>
      ),
    },
    {
      key: "delivered_at",
      header: "Entregue em",
      render: (caseItem) => formatDate(caseItem.delivered_at),
    },
    {
      key: "total_value",
      header: "Valor",
      render: (caseItem) => formatCurrency(caseItem.total_value),
    },
    {
      key: "actions",
      header: "Ações",
      render: (caseItem) => (
        <div className="row-actions">
          <Button
            variant="secondary"
            iconOnly
            aria-label="Abrir detalhes"
            onClick={() => onOpenCaseItems(caseItem.id)}
          >
            <Eye size={16} />
          </Button>
          <Button variant="danger" iconOnly aria-label="Excluir caso" onClick={() => onRemoveCase(caseItem.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      kicker="Casos"
      title="Casos"
      description="Consulte, filtre e acompanhe todos os casos da bancada."
      action={
        <Button variant="primary" onClick={() => setShowCaseModal(true)}>
          <Plus size={18} />
          Novo caso
        </Button>
      }
    >
      <div className="content-grid">
        <div className="case-toolbar">
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
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
          <div className="case-toolbar-meta" aria-live="polite">
            <span>{formatCaseCount(openCases.length, "caso em aberto", "casos em aberto")}</span>
            <span>{formatCaseCount(readyCases.length, "caso pronto", "casos prontos")}</span>
            <span>{formatCaseCount(historyCases.length, "caso entregue", "casos entregues")}</span>
          </div>
        </div>

        <section className="panel panel-strong">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Casos em aberto</h3>
              <p>Casos em produção e casos prontos aguardando entrega.</p>
            </div>
            <Button variant="success" onClick={openDeliverModal}>
              <PackageCheck size={18} />
              Registrar entrega
            </Button>
          </div>
          <div className="panel-body">
            <DataTable
              columns={openColumns}
              data={openCases}
              loading={loading}
              emptyIcon={Layers3}
              emptyTitle="Nenhum caso em aberto."
              emptyDescription="Os casos pendentes e prontos aparecem aqui antes da entrega."
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Histórico de entregas</h3>
              <p>Casos que já foram entregues.</p>
            </div>
          </div>
          <div className="panel-body">
            <DataTable
              columns={historyColumns}
              data={historyCases}
              loading={loading}
              emptyIcon={Layers3}
              emptyTitle="Nenhuma entrega registrada."
              emptyDescription="Os casos entregues ficam arquivados aqui."
            />
          </div>
        </section>
      </div>

      {showCaseModal && (
        <Modal
          title="Novo caso"
          description="Ficha rápida de entrada."
          onClose={() => setShowCaseModal(false)}
          className="case-modal-panel"
        >
          <CaseIntakeForm
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            caseForm={caseForm}
            busy={busy}
            submitLabel="Criar caso"
            submitIcon={Plus}
            onDoctorChange={setSelectedDoctorId}
            onCaseChange={onCaseChange}
            onSubmit={onCaseSubmit}
            layout="compact"
          />
        </Modal>
      )}

      {showDeliverModal && (
        <Modal
          title="Registrar entregas"
          description="Selecione os casos prontos que devem ser marcados como entregues."
          onClose={() => setShowDeliverModal(false)}
        >
          <form className="form-grid" onSubmit={handleDeliverSubmit}>
            <div className="deliver-list">
              {readyCases.length ? (
                readyCases.map((caseItem) => (
                  <label key={caseItem.id} className="deliver-choice">
                    <input
                      type="checkbox"
                      checked={selectedDeliveryIds.includes(caseItem.id)}
                      onChange={() => toggleDeliverySelection(caseItem.id)}
                    />
                    <span className="deliver-choice-copy">
                      <strong>{caseItem.patient_ref}</strong>
                      <small>
                        {doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`} ·{" "}
                        {formatCaseCount(getServiceCount(caseItem), "serviço", "serviços")}
                      </small>
                    </span>
                    <strong>{formatCurrency(caseItem.total_value)}</strong>
                  </label>
                ))
              ) : (
                <EmptyState
                  icon={PackageCheck}
                  title="Nenhum caso pronto para entrega."
                  description="Marque um caso como pronto para habilitá-lo aqui."
                />
              )}
            </div>
            <div className="confirm-modal-actions">
              <Button variant="ghost" onClick={() => setShowDeliverModal(false)}>
                Cancelar
              </Button>
              <Button variant="success" type="submit" disabled={!selectedDeliveryIds.length || busy}>
                <PackageCheck size={18} />
                Confirmar saída
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedCase && (
        <CaseDetailsPage
          caseItem={selectedCase}
          doctor={doctorById.get(selectedCase.doctor_id)}
          items={items}
          itemForm={itemForm}
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
