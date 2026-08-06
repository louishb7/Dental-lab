import { History, RotateCcw, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import PageContainer from "../components/layout/PageContainer.jsx";
import Button from "../components/ui/Button.jsx";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import Modal from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import {
  getCaseHistory,
  getCaseHistoryDetail,
  getCaseHistoryEvents,
  deleteCaseHistoryRecord,
  deleteCaseHistoryRecords,
  revertCaseStatus,
} from "../services/api.js";
import { formatServiceItemCount } from "../utils/cases.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const FILTER_CONTROL_CLASS =
  "min-h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25";
const EVENT_PAGE_SIZE = 8;
const HISTORY_PAGE_SIZE = 10;

const STATUS_LABELS = {
  pending: "Em andamento",
  completed: "Pronto",
  delivered: "Entregue",
};

const EVENT_LABELS = {
  case_created: "Caso criado",
  status_advanced: "Status avançado",
  status_reverted: "Status retornado",
};

function getRevertTarget(status) {
  if (status === "delivered") return { status: "completed", label: "Pronto" };
  if (status === "completed") return { status: "pending", label: "Em andamento" };
  return null;
}

function formatStatus(status) {
  return STATUS_LABELS[status] || status || "—";
}

function formatDateTime(value) {
  if (!value) return "Sem data";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatEvent(event) {
  const label = EVENT_LABELS[event.event_type] || "Movimentação";
  if (!event.from_status && event.to_status) {
    return `${label}: ${formatStatus(event.to_status)}`;
  }
  if (event.from_status && event.to_status) {
    return `${label}: ${formatStatus(event.from_status)} → ${formatStatus(event.to_status)}`;
  }
  return label;
}

function getUtcDateKey(value) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodRange(period) {
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  if (period === "month") {
    return {
      delivered_from: getUtcDateKey(currentMonthStart),
      delivered_to: getUtcDateKey(nextMonthStart),
    };
  }

  if (period === "last_3_months") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
    return { delivered_from: getUtcDateKey(start), delivered_to: getUtcDateKey(nextMonthStart) };
  }

  if (period === "last_6_months") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    return { delivered_from: getUtcDateKey(start), delivered_to: getUtcDateKey(nextMonthStart) };
  }

  if (period === "year") {
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

    return {
      delivered_from: getUtcDateKey(yearStart),
      delivered_to: getUtcDateKey(nextYearStart),
    };
  }

  return {};
}

function buildHistoryQuery(filters, page) {
  const period = getPeriodRange(filters.period);

  return {
    page,
    limit: HISTORY_PAGE_SIZE,
    q: filters.search.trim(),
    doctor_id: filters.doctorId,
    ...period,
  };
}

export default function HistoryPage({
  doctors,
  focusCaseId,
  busy,
  onStatusChanged,
  onMessage,
  onAuthExpired,
  onClearFocusCase,
}) {
  const [filters, setFilters] = useState({
    search: "",
    doctorId: "",
    period: "",
  });
  const [page, setPage] = useState(1);
  const [historyData, setHistoryData] = useState({ items: [], pagination: null });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsPagination, setEventsPagination] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [revertLoading, setRevertLoading] = useState(false);
  const [revertError, setRevertError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const pagination = historyData.pagination;
  const revertTarget = getRevertTarget(detail?.status);
  const hasActiveFilters = Boolean(filters.search.trim() || filters.doctorId || filters.period);
  const pageIds = historyData.items.map((caseItem) => caseItem.id);
  const hasPageItems = pageIds.length > 0;
  const allPageSelected = hasPageItems && pageIds.every((id) => selectedIds.has(id));

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-primary)]"
          checked={allPageSelected}
          disabled={!hasPageItems || deleteLoading}
          onChange={(event) => togglePageSelection(event.target.checked)}
          aria-label="Selecionar registros desta página"
        />
      ),
      render: (caseItem) => (
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-primary)]"
          checked={selectedIds.has(caseItem.id)}
          disabled={deleteLoading}
          onChange={(event) => toggleCaseSelection(caseItem.id, event.target.checked)}
          aria-label={`Selecionar ${caseItem.patient_ref}`}
        />
      ),
    },
    {
      key: "patient_ref",
      header: "Caso / Referência",
      render: (caseItem) => (
        <span className="grid min-w-0 gap-1">
          <strong className="truncate text-sm font-bold text-[var(--color-text)]">{caseItem.patient_ref}</strong>
          <small className="truncate text-xs text-[var(--color-text-muted)]">{caseItem.doctor_name}</small>
        </span>
      ),
    },
    {
      key: "items_summary",
      header: "Dentes / Itens",
      render: (caseItem) => (
        <span className="grid min-w-0 gap-1">
          <strong className="truncate text-sm font-bold text-[var(--color-text)]">{caseItem.items_summary}</strong>
          <small className="text-xs text-[var(--color-text-muted)]">{caseItem.items_count} itens de serviço</small>
        </span>
      ),
    },
    { key: "total_value", header: "Valor", render: (caseItem) => formatCurrency(caseItem.total_value) },
    { key: "status", header: "Status", render: (caseItem) => <StatusBadge status={caseItem.status} /> },
    { key: "delivered_at", header: "Entregue", render: (caseItem) => formatDate(caseItem.delivered_at) },
    {
      key: "actions",
      header: "Ações",
      render: (caseItem) => (
        <span className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => openDetails(caseItem.id)}>
            Ver histórico
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deleteLoading}
            onClick={() => requestDeleteOne(caseItem.id)}
          >
            <Trash2 size={14} />
            Apagar
          </Button>
        </span>
      ),
    },
  ];

  useEffect(() => {
    void loadHistoryList();
  }, [filters, page]);

  useEffect(() => {
    if (!focusCaseId) return;
    void openDetails(Number(focusCaseId));
  }, [focusCaseId]);

  async function loadHistoryList() {
    setListLoading(true);
    setListError("");
    try {
      const data = await getCaseHistory(buildHistoryQuery(filters, page));
      setHistoryData({
        items: Array.isArray(data?.items) ? data.items : [],
        pagination: data?.pagination || null,
      });
      setSelectedIds(new Set());
    } catch (error) {
      if (handleUnauthorizedError(error)) return;
      setListError(error.message);
    } finally {
      setListLoading(false);
    }
  }

  async function openDetails(caseId) {
    setSelectedCaseId(caseId);
    setDetail(null);
    setEvents([]);
    setEventsPagination(null);
    setDetailLoading(true);
    setDetailError("");
    setShowRevertModal(false);
    setRevertReason("");
    setRevertError("");

    try {
      const [caseDetail, timeline] = await Promise.all([
        getCaseHistoryDetail(caseId),
        getCaseHistoryEvents(caseId, { page: 1, limit: EVENT_PAGE_SIZE }),
      ]);
      setDetail(caseDetail);
      setEvents(Array.isArray(timeline?.items) ? timeline.items : []);
      setEventsPagination(timeline?.pagination || null);
    } catch (error) {
      if (handleUnauthorizedError(error)) return;
      setDetailError(error.message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadMoreEvents() {
    if (!selectedCaseId || !eventsPagination?.has_next_page) return;

    setDetailLoading(true);
    setDetailError("");
    try {
      const nextPage = eventsPagination.page + 1;
      const timeline = await getCaseHistoryEvents(selectedCaseId, {
        page: nextPage,
        limit: EVENT_PAGE_SIZE,
      });
      setEvents((current) => [...current, ...(Array.isArray(timeline?.items) ? timeline.items : [])]);
      setEventsPagination(timeline?.pagination || null);
    } catch (error) {
      if (handleUnauthorizedError(error)) return;
      setDetailError(error.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetails() {
    setSelectedCaseId(null);
    setDetail(null);
    setEvents([]);
    setEventsPagination(null);
    setShowRevertModal(false);
    onClearFocusCase?.();
  }

  function clearFilters() {
    setFilters({
      search: "",
      doctorId: "",
      period: "",
    });
    setPage(1);
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  function toggleCaseSelection(caseId, checked) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(caseId);
      } else {
        next.delete(caseId);
      }

      return next;
    });
  }

  function togglePageSelection(checked) {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });

      return next;
    });
  }

  async function refreshAfterDelete(deletedCount) {
    if (deletedCount > 0 && historyData.items.length === deletedCount && page > 1) {
      setPage((current) => Math.max(1, current - 1));
      return;
    }

    await loadHistoryList();
  }

  async function deleteOne(caseId) {
    setDeleteLoading(true);
    setListError("");
    try {
      const result = await deleteCaseHistoryRecord(caseId);
      if (selectedCaseId === caseId) {
        closeDetails();
      }
      await Promise.all([refreshAfterDelete(result?.deleted_count ?? 1), onStatusChanged?.()]);
      onMessage?.({ type: "success", text: "Registro apagado permanentemente." });
    } catch (error) {
      if (handleUnauthorizedError(error)) return;
      setListError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function deleteSelected() {
    const caseIds = [...selectedIds];
    if (!caseIds.length) return;

    setDeleteLoading(true);
    setListError("");
    try {
      const result = await deleteCaseHistoryRecords(caseIds);
      if (selectedCaseId && caseIds.includes(selectedCaseId)) {
        closeDetails();
      }
      await Promise.all([refreshAfterDelete(result?.deleted_count ?? caseIds.length), onStatusChanged?.()]);
      onMessage?.({ type: "success", text: "Registros selecionados apagados permanentemente." });
    } catch (error) {
      if (handleUnauthorizedError(error)) return;
      setListError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  function requestDeleteOne(caseId) {
    setPendingDelete({
      title: "Apagar registro",
      description: "Esta ação remove permanentemente o caso e seu histórico. Não pode ser desfeita.",
      confirmLabel: "Apagar",
      action: () => {
        void deleteOne(caseId);
      },
    });
  }

  function requestDeleteSelected() {
    if (!selectedIds.size) return;

    setPendingDelete({
      title: "Apagar selecionados",
      description: `${selectedIds.size} ${
        selectedIds.size === 1 ? "registro será removido" : "registros serão removidos"
      } permanentemente. Esta ação não pode ser desfeita.`,
      confirmLabel: "Apagar",
      action: () => {
        void deleteSelected();
      },
    });
  }

  async function submitRevert(event) {
    event.preventDefault();
    if (!selectedCaseId) return;

    setRevertLoading(true);
    setRevertError("");
    try {
      await revertCaseStatus(selectedCaseId, { reason: revertReason });
      setShowRevertModal(false);
      setRevertReason("");
      await Promise.all([openDetails(selectedCaseId), loadHistoryList(), onStatusChanged?.()]);
      onMessage?.({ type: "success", text: "Status retornado com histórico registrado." });
    } catch (error) {
      if (handleUnauthorizedError(error)) return;
      setRevertError(error.message);
    } finally {
      setRevertLoading(false);
    }
  }

  function handleUnauthorizedError(error) {
    if (error?.status !== 401) return false;

    onAuthExpired?.("Sessão expirada. Faça login novamente.");
    return true;
  }

  return (
    <PageContainer
      kicker="Histórico"
      title="Histórico"
      description="Arquivo pesquisável de trabalhos criados, entregues e retornados."
    >
      <div className="grid gap-4">
        <section className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="grid grid-cols-[minmax(280px,2fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_auto] gap-2 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={15} />
              <input
                className={`${FILTER_CONTROL_CLASS} pl-9`}
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Buscar paciente ou referência"
                aria-label="Buscar histórico"
              />
            </label>
            <select
              className={FILTER_CONTROL_CLASS}
              value={filters.doctorId}
              onChange={(event) => updateFilter("doctorId", event.target.value)}
              aria-label="Filtrar por dentista"
            >
              <option value="">Todos dentistas</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <select
              className={FILTER_CONTROL_CLASS}
              value={filters.period}
              onChange={(event) => updateFilter("period", event.target.value)}
              aria-label="Filtrar por período de entrega"
            >
              <option value="">Todos os períodos</option>
              <option value="month">Este mês</option>
              <option value="last_3_months">Últimos 3 meses</option>
              <option value="last_6_months">Últimos 6 meses</option>
              <option value="year">Este ano</option>
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-md border border-primary/30 bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 max-[640px]:flex-col">
            <div className="grid gap-1">
              <h3 className="text-base font-bold leading-tight">Arquivo de casos</h3>
              <p className="text-sm leading-snug text-[var(--color-text-muted)]">
                {pagination ? `${pagination.total} registros encontrados.` : "Busque trabalhos antigos por caso, dentista ou entrega."}
              </p>
            </div>
            {selectedIds.size > 0 && (
              <Button variant="danger" size="sm" disabled={deleteLoading} onClick={requestDeleteSelected}>
                <Trash2 size={14} />
                Apagar selecionados
              </Button>
            )}
          </div>
          <div className="grid gap-3 p-4">
            <DataTable
              columns={columns}
              data={historyData.items}
              loading={listLoading}
              error={listError}
              emptyIcon={History}
              emptyTitle={hasActiveFilters ? "Nenhum caso encontrado com esses filtros." : "Nenhum caso no histórico."}
              emptyDescription={
                hasActiveFilters
                  ? "Ajuste a busca, o dentista ou o período para ampliar a consulta."
                  : "Os casos criados, entregues ou retornados aparecerão aqui."
              }
              onRetry={loadHistoryList}
            />
            {pagination && pagination.total_pages > 1 && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1 || listLoading} onClick={() => setPage((current) => current - 1)}>
                  Anterior
                </Button>
                <span className="text-sm font-bold text-[var(--color-text-muted)]">
                  Página {pagination.page} de {pagination.total_pages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.has_next_page || listLoading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedCaseId && (
        <Modal title="Histórico do caso" description="Resumo e movimentações persistentes." onClose={closeDetails} className="max-w-[860px]">
          {detailLoading && !detail ? (
            <LoadingState message="Carregando histórico..." />
          ) : detailError ? (
            <ErrorState message={detailError} onRetry={() => openDetails(selectedCaseId)} />
          ) : detail ? (
            <div className="grid gap-4">
              <section className="grid gap-3 rounded-md border border-primary/30 bg-[var(--color-subtle)] p-4">
                <div className="flex items-start justify-between gap-3 max-[640px]:flex-col">
                  <div className="grid min-w-0 gap-1">
                    <strong className="truncate text-base font-bold text-[var(--color-text)]">{detail.patient_ref}</strong>
                    <span className="text-sm text-[var(--color-text-muted)]">{detail.doctor_name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={detail.status} />
                    {detail.has_reverted && (
                      <span className="rounded-full border border-[color-mix(in_srgb,var(--color-warning-soft)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warning-soft)_10%,transparent)] px-2 py-0.5 text-xs font-bold text-[var(--color-warning-soft)]">
                        Teve retorno
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-2">
                  <div className="grid gap-1">
                    <small className="text-xs font-bold text-[var(--color-text-muted)]">Entrega recente</small>
                    <strong className="text-sm text-[var(--color-text)]">{formatDate(detail.delivered_at)}</strong>
                  </div>
                  <div className="grid gap-1">
                    <small className="text-xs font-bold text-[var(--color-text-muted)]">Valor</small>
                    <strong className="text-sm text-[var(--color-text)]">{formatCurrency(detail.total_value)}</strong>
                  </div>
                  <div className="grid gap-1">
                    <small className="text-xs font-bold text-[var(--color-text-muted)]">Itens</small>
                    <strong className="text-sm text-[var(--color-text)]">{formatServiceItemCount(detail)}</strong>
                  </div>
                </div>

                {detail.items.length > 0 && (
                  <div className="grid gap-2 border-t border-[var(--color-border)] pt-3">
                    <small className="text-xs font-bold text-[var(--color-text-muted)]">Dentes e serviços</small>
                    <div className="flex flex-wrap gap-2">
                      {detail.items.map((item) => (
                        <span key={item.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-text-soft)]">
                          {item.quantity > 1 ? `${item.quantity}x ` : ""}
                          {item.tooth ? `Dente ${item.tooth}` : "Sem dente"} · {item.service_type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {revertTarget && !detail.deleted_at && (
                  <div className="flex justify-end border-t border-[var(--color-border)] pt-3">
                    <Button variant="secondary" size="sm" onClick={() => setShowRevertModal(true)}>
                      <RotateCcw size={16} />
                      Retornar para {revertTarget.label}
                    </Button>
                  </div>
                )}
              </section>

              <section className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h3 className="text-base font-bold text-[var(--color-text)]">Timeline</h3>
                {events.length ? (
                  <div className="grid gap-2">
                    {events.map((event) => (
                      <article key={event.id} className="grid gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-sm font-bold text-[var(--color-text)]">{formatEvent(event)}</strong>
                          <span className="text-xs font-semibold text-[var(--color-text-muted)]">{formatDateTime(event.created_at)}</span>
                        </div>
                        {event.reason && <p className="text-sm leading-snug text-[var(--color-text-soft)]">Motivo: {event.reason}</p>}
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={History} title="Nenhum evento registrado." />
                )}
                {eventsPagination?.has_next_page && (
                  <div className="flex justify-end">
                    <Button variant="secondary" size="sm" disabled={detailLoading} onClick={loadMoreEvents}>
                      Carregar mais
                    </Button>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </Modal>
      )}

      {showRevertModal && revertTarget && (
        <Modal
          title={`Retornar para ${revertTarget.label}`}
          description="O backend calculará o status anterior permitido e registrará o motivo no histórico."
          onClose={() => setShowRevertModal(false)}
          className="max-w-[560px]"
        >
          <form className="grid gap-3" onSubmit={submitRevert}>
            <p className="text-sm leading-relaxed text-[var(--color-text-soft)]">
              Este caso sairá de <strong>{formatStatus(detail?.status)}</strong> e voltará para{" "}
              <strong>{revertTarget.label}</strong>. Informe o motivo para manter a auditoria do workflow.
            </p>
            <label className="grid gap-1.5 text-xs font-bold text-[var(--color-text-muted)]">
              Motivo do retorno
              <textarea
                className="min-h-28 rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25"
                value={revertReason}
                onChange={(event) => setRevertReason(event.target.value)}
                placeholder="Ex.: Dentista solicitou ajuste no contato proximal"
                required
              />
            </label>
            {revertError && <p className="text-sm font-semibold text-[var(--color-danger-soft)]">{revertError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowRevertModal(false)}>
                Cancelar
              </Button>
              <Button variant="success" type="submit" disabled={busy || revertLoading}>
                Confirmar retorno
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={pendingDelete.title}
          description={pendingDelete.description}
          confirmLabel={pendingDelete.confirmLabel}
          onConfirm={() => {
            pendingDelete.action();
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </PageContainer>
  );
}
