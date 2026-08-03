import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  PackageCheck,
  Trash2,
} from "lucide-react";
import DayBoard from "../components/dashboard/DayBoard.jsx";
import WeekSchedule from "../components/dashboard/WeekSchedule.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";
import Button from "../components/ui/Button.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { getLocalDateKey } from "../utils/formatters.js";
import {
  addDays,
  formatDayMonth,
  getStartOfWeek,
  getWeekDays,
  groupCasesByDate,
  isOverdue,
  isSameDate,
  isToday,
  isTomorrow,
} from "../utils/productionWeek.js";

function enrichCase(caseItem, doctorById) {
  return {
    ...caseItem,
    doctor_name: doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`,
  };
}

function sortByPriorityAndDeadline(a, b) {
  if (a.priority !== b.priority) {
    return a.priority === "urgent" ? -1 : 1;
  }

  return String(a.deadline || "").localeCompare(String(b.deadline || ""));
}

function formatCaseCount(count) {
  return `${count} ${count === 1 ? "caso" : "casos"}`;
}

function getDayBoardTitle(date) {
  if (isToday(date)) return "Casos de hoje";
  if (isTomorrow(date)) return "Casos de amanhã";
  return `Casos de ${formatDayMonth(date)}`;
}

function getDayBoardDescription(date, count) {
  if (isToday(date)) {
    return count ? "Casos com prazo para hoje." : "Nenhum caso com prazo para hoje.";
  }

  if (isTomorrow(date)) {
    return count ? "Casos que entram amanhã." : "Nenhum caso programado para amanhã.";
  }

  return count
    ? `Casos planejados para ${formatDayMonth(date)}.`
    : `Nenhum caso planejado para ${formatDayMonth(date)}.`;
}

function AttentionPanel({
  title,
  description,
  cases,
  emptyTitle,
  emptyIcon = PackageCheck,
  onOpenCase,
  onDeliverCase,
  onRemoveCase,
  className = "",
  showActions = false,
}) {
  return (
    <section className={`rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm ${className}`.trim()}>
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="grid gap-1">
          <h3 className="text-base font-bold leading-tight">{title}</h3>
          <p className="text-sm leading-snug text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
      <div className="p-4">
        {cases.length ? (
          <div className="grid gap-2">
            {cases.slice(0, 3).map((caseItem) => (
              <article
                key={caseItem.id}
                className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] p-2.5"
              >
                <button className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left" type="button" onClick={() => onOpenCase(caseItem.id)}>
                  <span className="grid min-w-0 gap-1">
                    <strong className="truncate text-sm font-bold">{caseItem.patient_ref}</strong>
                    <small className="truncate text-xs text-[var(--color-text-muted)]">{caseItem.doctor_name}</small>
                  </span>
                  <span className="shrink-0">
                    <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
                  </span>
                </button>
                {showActions && (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => onDeliverCase(caseItem.id)}
                    >
                      <PackageCheck size={14} />
                      Entregue
                    </Button>
                    <Button
                      variant="danger"
                      iconOnly
                      aria-label="Excluir caso"
                      onClick={() => onRemoveCase(caseItem.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description="Nada pendente neste bloco."
          />
        )}
      </div>
    </section>
  );
}

export default function DashboardPage({
  cases = [],
  doctors = [],
  loading,
  onOpenNewCase,
  onOpenNewCaseForDate,
  onOpenCase,
  onDeliverCases,
  onRemoveCase,
}) {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(today));
  const [selectedDate, setSelectedDate] = useState(() => today);

  if (loading) {
    return (
      <PageContainer title="Bancada" description="Carregando visão semanal dos casos.">
        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <LoadingState message="Carregando bancada..." />
        </section>
      </PageContainer>
    );
  }

  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const activeCases = cases
    .filter((caseItem) => caseItem.status !== "delivered")
    .map((caseItem) => enrichCase(caseItem, doctorById));
  const groupedCases = groupCasesByDate(activeCases);
  const overdueCases = activeCases.filter(isOverdue).sort(sortByPriorityAndDeadline);
  const readyCases = activeCases
    .filter((caseItem) => caseItem.status === "completed")
    .sort(sortByPriorityAndDeadline);
  const pendingCases = activeCases
    .filter((caseItem) => caseItem.status === "pending")
    .sort(sortByPriorityAndDeadline);
  const todayCases = activeCases
    .filter((caseItem) => isSameDate(caseItem.deadline, today))
    .sort(sortByPriorityAndDeadline);
  const weekDays = getWeekDays(weekStart);
  const selectedDayKey = getLocalDateKey(selectedDate);
  const selectedDayCases = [...(groupedCases.get(selectedDayKey) || [])].sort(sortByPriorityAndDeadline);

  function shiftWeek(amount) {
    const currentWeekDays = getWeekDays(weekStart);
    const selectedIndex = currentWeekDays.findIndex((day) => isSameDate(day, selectedDate));
    const nextWeekStart = addDays(weekStart, amount * 7);
    const nextWeekDays = getWeekDays(nextWeekStart);
    const nextSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;

    setWeekStart(nextWeekStart);
    setSelectedDate(nextWeekDays[nextSelectedIndex] || nextWeekStart);
  }

  return (
    <PageContainer
      kicker="Bancada"
      title="Bancada"
      description="Organize seus casos da semana e acompanhe o que precisa de atenção."
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-4 max-[1120px]:grid-cols-2 max-[640px]:grid-cols-1">
          <StatCard
            title="Hoje"
            value={todayCases.length}
            description={formatCaseCount(todayCases.length)}
            icon={CalendarDays}
            tone="warning"
            compact
          />
          <StatCard
            title="Pendentes"
            value={pendingCases.length}
            description="Casos ainda em produção"
            icon={AlertTriangle}
            tone="warning"
            compact
          />
          <StatCard
            title="Prontos para entrega"
            value={readyCases.length}
            description="Casos concluídos"
            icon={PackageCheck}
            tone="success"
            compact
          />
        </div>

        <WeekSchedule
          groupedCases={groupedCases}
          selectedDate={selectedDate}
          weekDays={weekDays}
          weekStart={weekStart}
          onPreviousWeek={() => shiftWeek(-1)}
          onNextWeek={() => shiftWeek(1)}
          onSelectDate={setSelectedDate}
          onOpenNewCase={onOpenNewCase}
          onOpenNewCaseForDate={onOpenNewCaseForDate}
        />

        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-4 max-[1120px]:grid-cols-1">
          <DayBoard
            title={getDayBoardTitle(selectedDate)}
            description={getDayBoardDescription(selectedDate, selectedDayCases.length)}
            cases={selectedDayCases}
            onOpenCase={onOpenCase}
          />

          <AttentionPanel
            title="Prontos para entrega"
            description="Saída pendente."
            cases={readyCases}
            emptyTitle="Nenhum caso pronto."
            emptyIcon={PackageCheck}
            onOpenCase={onOpenCase}
          />
        </div>

        {overdueCases.length > 0 && (
          <AttentionPanel
            title="Atrasados"
            description="Casos fora do prazo."
            cases={overdueCases}
            emptyTitle="Nenhum caso atrasado."
            emptyIcon={AlertTriangle}
            onOpenCase={onOpenCase}
            onDeliverCase={(caseId) => onDeliverCases([caseId])}
            onRemoveCase={onRemoveCase}
            showActions
          />
        )}
      </div>
    </PageContainer>
  );
}
