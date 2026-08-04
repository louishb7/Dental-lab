import { useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";
import AttentionPanel from "../components/dashboard/AttentionPanel.jsx";
import DayBoard from "../components/dashboard/DayBoard.jsx";
import WeekSchedule from "../components/dashboard/WeekSchedule.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import CaseDetailsPage from "./CaseDetailsPage.jsx";
import { getLocalDateKey } from "../utils/formatters.js";
import {
  addDays,
  formatDayMonth,
  getStartOfWeek,
  getWeekDays,
  groupCasesByDate,
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

export default function DashboardPage({
  cases = [],
  doctors = [],
  loading,
  busy,
  selectedCase,
  items = [],
  itemForm,
  onOpenNewCase,
  onOpenNewCaseForDate,
  onOpenCase,
  onAdvanceCase,
  onDeliverCase,
  onItemChange,
  onItemSubmit,
  onRemoveItem,
  onCloseDetails,
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
  const readyCases = activeCases
    .filter((caseItem) => caseItem.status === "completed")
    .sort(sortByPriorityAndDeadline);
  const weekDays = getWeekDays(weekStart);
  const selectedDayKey = getLocalDateKey(selectedDate);
  const selectedDayCases = [...(groupedCases.get(selectedDayKey) || [])].sort(sortByPriorityAndDeadline);
  const selectedDayHasPending = selectedDayCases.some((caseItem) => caseItem.status === "pending");
  const selectedDayTitle = getDayBoardTitle(selectedDate);

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
            title={
              isToday(selectedDate) && selectedDayHasPending ? (
                <span className="inline-flex items-center gap-2">
                  {selectedDayTitle}
                  <span
                    className="size-2 rounded-full bg-[var(--color-warning-soft)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-warning-soft)_14%,transparent)]"
                    aria-label="Há casos pendentes hoje"
                    title="Há casos pendentes hoje"
                  />
                </span>
              ) : (
                selectedDayTitle
              )
            }
            description={getDayBoardDescription(selectedDate, selectedDayCases.length)}
            cases={selectedDayCases}
            onOpenCase={onOpenCase}
            onAdvanceCase={onAdvanceCase}
            showReadyAction
          />

          <AttentionPanel
            title="Prontos para entrega"
            description="Saída pendente."
            cases={readyCases}
            emptyTitle="Nenhum caso pronto."
            emptyIcon={PackageCheck}
            onOpenCase={onOpenCase}
            onDeliverCase={onDeliverCase}
            showActions
            showRemoveAction={false}
            discreetActions
          />
        </div>
      </div>

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
