import { AlertTriangle, Layers3, PackageCheck, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CaseIntakeForm from "../components/cases/CaseIntakeForm.jsx";
import AttentionPanel from "../components/dashboard/AttentionPanel.jsx";
import Button from "../components/ui/Button.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Modal from "../components/ui/Modal.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency } from "../utils/formatters.js";
import { formatServiceItemCount } from "../utils/cases.js";
import { isOverdue } from "../utils/productionWeek.js";
import CaseDetailsPage from "./CaseDetailsPage.jsx";

const FILTER_CONTROL_CLASS =
  "min-h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25";
const VERTICAL_READY_CLASS =
  "!h-auto !min-h-[118px] !w-12 !min-w-0 !rounded-2xl !px-1.5 !py-2.5 !text-[0.68rem] !font-black uppercase !tracking-[0.18em] [text-orientation:mixed] [writing-mode:vertical-rl]";
const VERTICAL_READY_LABEL_CLASS =
  "inline-flex min-h-[118px] w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--color-success-soft)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success-soft)_10%,transparent)] px-1.5 py-2.5 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-success-soft)] [text-orientation:mixed] [writing-mode:vertical-rl]";

function sortByPriorityAndDeadline(a, b) {
  if (a.priority !== b.priority) {
    return a.priority === "urgent" ? -1 : 1;
  }

  return String(a.deadline || "").localeCompare(String(b.deadline || ""));
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
  onNewCase,
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
    doctorId: selectedDoctorId ? String(selectedDoctorId) : "",
  });
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState([]);
  const lastReadyCaseIdsRef = useRef(new Set());

  function clearFilters() {
    setFilters({ search: "", status: "", doctorId: "" });
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
      const matchesDoctor = !filters.doctorId || caseItem.doctor_id === Number(filters.doctorId);

      return matchesSearch && matchesStatus && matchesDoctor;
    });
  }, [cases, doctorById, filters]);

  const openCases = filteredCases.filter((caseItem) => caseItem.status !== "delivered");
  const readyCases = openCases.filter((caseItem) => caseItem.status === "completed");
  const productionCaseCount = openCases.filter((caseItem) => caseItem.status === "pending").length;
  const overdueCases = openCases
    .filter(isOverdue)
    .map((caseItem) => ({
      ...caseItem,
      doctor_name: doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`,
    }))
    .sort(sortByPriorityAndDeadline);

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
        <span className="grid min-w-0 gap-1">
          <strong className="truncate text-sm font-bold text-[var(--color-text)]">{caseItem.patient_ref}</strong>
          <small className="truncate text-xs text-[var(--color-text-muted)]">{doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`}</small>
        </span>
      ),
    },
    {
      key: "services",
      header: "Resumo",
      render: (caseItem) => (
        <span className="block min-w-0">
          <strong className="text-sm font-bold text-[var(--color-text)]">{formatServiceItemCount(caseItem)}</strong>
        </span>
      ),
    },
    {
      key: "deadline",
      header: "Prazo",
      render: (caseItem) => (
        <span className="grid min-w-0 gap-1">
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
        <div className="flex flex-wrap items-center gap-1.5">
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
      render: (caseItem) => {
        if (caseItem.status === "pending") {
          return (
            <div className="flex justify-end">
              <Button
                variant="success"
                className={VERTICAL_READY_CLASS}
                aria-label="Marcar como pronto"
                title="Marcar como pronto"
                onClick={() => onAdvanceCase(caseItem)}
              >
                PRONTO
              </Button>
            </div>
          );
        }

        if (caseItem.status === "completed") {
          return (
            <div className="flex justify-end">
              <span className={VERTICAL_READY_LABEL_CLASS} aria-label="Pedido pronto para entrega">
                PRONTO
              </span>
            </div>
          );
        }

        return (
          <div className="flex justify-end">
            <span className="text-sm text-[var(--color-text-muted)]">—</span>
          </div>
        );
      },
    },
  ];

  return (
    <PageContainer
      kicker="Casos"
      title="Casos"
      description="Consulte, filtre e acompanhe todos os casos da bancada."
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <div className="grid grid-cols-[minmax(220px,1.8fr)_repeat(2,minmax(132px,1fr))_max-content] gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 max-[1120px]:grid-cols-2 max-[640px]:grid-cols-1">
            <input
              className={FILTER_CONTROL_CLASS}
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Buscar por caso, paciente ou dentista"
              aria-label="Buscar casos"
            />
            <select
              className={FILTER_CONTROL_CLASS}
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              aria-label="Filtrar por status"
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="completed">Pronto</option>
            </select>
            <select
              className={FILTER_CONTROL_CLASS}
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
        </div>

        <section className="rounded-md border border-primary/30 bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 max-[640px]:flex-col">
            <div className="grid gap-1">
              <h3 className="text-base font-bold leading-tight">Casos em aberto</h3>
              <p className="text-sm leading-snug text-[var(--color-text-muted)]">
                {productionCaseCount} em produção, {readyCases.length} prontos para entrega.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={onNewCase}>
                <Plus size={18} />
                Novo caso
              </Button>
              <Button variant="success" onClick={openDeliverModal}>
                <PackageCheck size={18} />
                Registrar entrega
              </Button>
            </div>
          </div>
          <div className="p-4">
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

        {overdueCases.length > 0 && (
          <AttentionPanel
            title="Atrasados"
            description="Casos fora do prazo."
            cases={overdueCases}
            emptyTitle="Nenhum caso atrasado."
            emptyIcon={AlertTriangle}
            onOpenCase={onOpenCaseItems}
            onDeliverCase={(caseId) => onBulkDeliverCases([caseId])}
            onRemoveCase={onRemoveCase}
            showActions
          />
        )}

      </div>

      {showCaseModal && (
        <Modal
          title="Novo caso"
          description="Ficha rápida de entrada."
          onClose={() => setShowCaseModal(false)}
          className="max-w-[1200px]"
        >
          <CaseIntakeForm
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            caseForm={caseForm}
            busy={busy}
            submitLabel="Salvar caso"
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
          <form className="grid gap-4" onSubmit={handleDeliverSubmit}>
            <div className="grid gap-2">
              {readyCases.length ? (
                readyCases.map((caseItem) => (
                  <label key={caseItem.id} className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] p-3">
                    <input
                      className="size-4 accent-[var(--color-primary)]"
                      type="checkbox"
                      checked={selectedDeliveryIds.includes(caseItem.id)}
                      onChange={() => toggleDeliverySelection(caseItem.id)}
                    />
                    <span className="grid min-w-0 gap-1">
                      <strong className="truncate text-sm font-bold text-[var(--color-text)]">{caseItem.patient_ref}</strong>
                      <small className="truncate text-xs text-[var(--color-text-muted)]">
                        {doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`} ·{" "}
                        {formatServiceItemCount(caseItem)}
                      </small>
                    </span>
                    <strong className="text-sm font-bold text-[var(--color-text)]">{formatCurrency(caseItem.total_value)}</strong>
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
            <div className="flex flex-wrap justify-end gap-2">
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
