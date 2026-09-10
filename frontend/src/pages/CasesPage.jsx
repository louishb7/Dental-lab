import { AlertTriangle, Eye, Layers3, PackageCheck, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CaseIntakeForm from "../components/cases/CaseIntakeForm.jsx";
import AttentionPanel from "../components/dashboard/AttentionPanel.jsx";
import Button from "../components/ui/Button.jsx";
import ActionsMenu from "../components/ui/ActionsMenu.jsx";
import FilterToolbar from "../components/ui/FilterToolbar.jsx";
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
  "min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25";
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
  filterResetSignal,
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

  useEffect(() => {
    if (!filterResetSignal) return;

    setFilters({ search: "", status: "", doctorId: "" });
  }, [filterResetSignal]);

  const doctorById = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor])), [doctors]);

  const filteredCases = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return cases.filter((caseItem) => {
      const doctor = doctorById.get(caseItem.doctor_id);
      const matchesSearch =
        !search ||
        caseItem.patient_ref?.toLowerCase().includes(search) ||
        String(caseItem.id).includes(search) ||
        doctor?.name?.toLowerCase().includes(search);
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
      current.includes(caseId) ? current.filter((itemId) => itemId !== caseId) : [...current, caseId],
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

  function caseActions(caseItem) {
    return (
      <div className="flex items-center justify-end gap-1">
        {caseItem.status === "pending" && (
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Marcar ${caseItem.patient_ref} como pronto`}
            onClick={() => onAdvanceCase(caseItem)}
          >
            <PackageCheck size={15} />
            Pronto
          </Button>
        )}
        <ActionsMenu
          label={`Ações de ${caseItem.patient_ref}`}
          items={[
            { label: "Exibir detalhes", icon: Eye, onSelect: () => onOpenCaseItems(caseItem.id) },
            { label: "Excluir caso", icon: Trash2, danger: true, onSelect: () => onRemoveCase(caseItem.id) },
          ]}
        />
      </div>
    );
  }

  function caseIdentity(caseItem) {
    return (
      <div className="grid min-w-0 gap-1">
        <button
          className="break-words text-left font-semibold text-[var(--color-text)] underline-offset-4 hover:text-primary hover:underline"
          onClick={() => onOpenCaseItems(caseItem.id)}
        >
          {caseItem.patient_ref}
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">
          {doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`}
        </span>
        <PriorityBadge priority={caseItem.priority} />
      </div>
    );
  }

  const openColumns = [
    { key: "patient_ref", header: "Paciente / Dentista", className: "w-[29%]", render: caseIdentity },
    { key: "services", header: "Serviços", className: "w-[16%]", render: formatServiceItemCount },
    {
      key: "deadline",
      header: "Prazo",
      className: "w-[13%]",
      render: (item) => <DeadlineBadge deadline={item.deadline} status={item.status} />,
    },
    {
      key: "status",
      header: "Estado",
      className: "w-[12%]",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "total_value",
      header: "Valor",
      className: "w-[13%] tabular-nums",
      render: (item) => formatCurrency(item.total_value),
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      className: "w-[17%]",
      render: caseActions,
    },
  ];

  return (
    <PageContainer
      kicker="Casos"
      title="Casos"
      description="Consulte, filtre e acompanhe todos os casos da bancada."
    >
      <div className="grid min-w-0 gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Trabalhos em aberto</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {productionCaseCount} em produção · {readyCases.length} prontos
            </p>
          </div>
          <Button variant="primary" onClick={onNewCase}>
            <Plus size={16} />
            Novo caso
          </Button>
        </div>
        <FilterToolbar
          activeCount={Number(Boolean(filters.status)) + Number(Boolean(filters.doctorId))}
          search={
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                className={`${FILTER_CONTROL_CLASS} pl-9`}
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Buscar paciente, caso ou dentista"
                aria-label="Buscar casos"
              />
            </label>
          }
        >
          <select
            className={FILTER_CONTROL_CLASS}
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os estados</option>
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
        </FilterToolbar>
        {readyCases.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-[var(--color-success)] pl-3 text-sm">
            <span className="text-[var(--color-text-soft)]">
              {readyCases.length}{" "}
              {readyCases.length === 1 ? "caso pronto para sair" : "casos prontos para sair"}
            </span>
            <Button variant="secondary" size="sm" onClick={openDeliverModal}>
              <PackageCheck size={16} />
              Registrar entrega
            </Button>
          </div>
        )}
        <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <DataTable
            columns={openColumns}
            data={openCases}
            loading={loading}
            emptyIcon={Layers3}
            emptyTitle="Nenhum caso em aberto."
            emptyDescription="Os casos pendentes e prontos aparecem aqui antes da entrega."
            renderMobile={(caseItem) => (
              <article className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>{caseIdentity(caseItem)}</div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge status={caseItem.status} />
                  <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
                  <span>{formatServiceItemCount(caseItem)}</span>
                  <strong className="tabular-nums text-[var(--color-text-soft)]">
                    {formatCurrency(caseItem.total_value)}
                  </strong>
                </div>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onOpenCaseItems(caseItem.id)}>
                    <Eye size={15} />
                    Detalhes
                  </Button>
                  {caseActions(caseItem)}
                </div>
              </article>
            )}
          />
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
          description="Identifique o trabalho, selecione os dentes e confira os valores."
          onClose={() => setShowCaseModal(false)}
          className="max-w-[1060px]"
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
                  <label
                    key={caseItem.id}
                    className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] p-3"
                  >
                    <input
                      className="size-4 accent-[var(--color-primary)]"
                      type="checkbox"
                      checked={selectedDeliveryIds.includes(caseItem.id)}
                      onChange={() => toggleDeliverySelection(caseItem.id)}
                    />
                    <span className="grid min-w-0 gap-1">
                      <strong className="truncate text-sm font-bold text-[var(--color-text)]">
                        {caseItem.patient_ref}
                      </strong>
                      <small className="truncate text-xs text-[var(--color-text-muted)]">
                        {doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`} ·{" "}
                        {formatServiceItemCount(caseItem)}
                      </small>
                    </span>
                    <strong className="text-sm font-bold text-[var(--color-text)]">
                      {formatCurrency(caseItem.total_value)}
                    </strong>
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
