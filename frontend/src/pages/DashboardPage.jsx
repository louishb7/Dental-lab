import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  PackageCheck,
  Plus,
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
    <section className={`panel attention-panel ${className}`.trim()}>
      <div className="panel-header">
        <div className="panel-title">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="panel-body">
        {cases.length ? (
          <div className="compact-case-list">
            {cases.slice(0, 3).map((caseItem) => (
              <article key={caseItem.id} className="compact-case-item">
                <button className="compact-case-open" type="button" onClick={() => onOpenCase(caseItem.id)}>
                  <span className="compact-case-main">
                    <strong>{caseItem.patient_ref}</strong>
                    <small>{caseItem.doctor_name}</small>
                  </span>
                  <span className="compact-case-side">
                    <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
                  </span>
                </button>
                {showActions && (
                  <span className="compact-case-actions">
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
        <section className="panel">
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
      action={
        <Button variant="primary" onClick={onOpenNewCase}>
          <Plus size={16} />
          Novo caso
        </Button>
      }
    >
      <div className="content-grid dashboard-surface">
        <div className="stat-grid compact">
          <StatCard
            title="Hoje"
            value={todayCases.length}
            description={formatCaseCount(todayCases.length)}
            icon={CalendarDays}
            tone="warning"
          />
          <StatCard
            title="Pendentes"
            value={pendingCases.length}
            description="Casos ainda em produção"
            icon={AlertTriangle}
            tone="warning"
          />
          <StatCard
            title="Prontos para entrega"
            value={readyCases.length}
            description="Casos concluídos"
            icon={PackageCheck}
            tone="success"
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
          onOpenNewCaseForDate={onOpenNewCaseForDate}
        />

        <div className="dashboard-main-grid">
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
            className="attention-panel-primary"
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
            className="attention-panel-secondary"
          />
        )}
      </div>
    </PageContainer>
  );
}
