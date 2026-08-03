import {
  formatWeekRange,
  formatWeekdayLabel,
  isToday,
} from "../../utils/productionWeek.js";
import { getLocalDateKey } from "../../utils/formatters.js";
import { Plus } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.jsx";

function formatCaseCount(count) {
  return `${count} ${count === 1 ? "caso" : "casos"}`;
}

function CaseCountBadge({ count }) {
  return (
    <Badge
      variant="outline"
      className="w-fit border-[rgba(229,235,241,0.14)] bg-[rgba(42,49,59,0.72)] px-2 py-0.5 text-[0.7rem] font-bold text-[#f3f4f6]"
    >
      {formatCaseCount(count)}
    </Badge>
  );
}

function DayCard({ day, cases, selected, onSelect, onOpenNewCaseForDate }) {
  const urgentCount = cases.filter((caseItem) => caseItem.priority === "urgent").length;
  const isCurrentDay = isToday(day);
  const isOffDay = cases.length === 0;

  return (
    <div
      className={[
        "grid min-h-[92px] min-w-0 gap-2 rounded-md border bg-[rgba(32,38,47,0.96)] p-2 text-[#f3f4f6] transition-colors",
        selected ? "border-[rgba(56,189,248,0.45)] shadow-[inset_0_0_0_1px_rgba(56,189,248,0.18)]" : "border-[rgba(229,235,241,0.13)]",
      ].join(" ")}
    >
      <button
        className="grid min-w-0 gap-2 text-left"
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(day)}
      >
        <div className="flex min-h-6 items-center justify-between gap-2">
          <span className="text-[0.68rem] font-bold uppercase text-[#aeb7c2]">
            {formatWeekdayLabel(day)}
          </span>
          {isCurrentDay && (
            <Badge
              variant="outline"
              className="border-[rgba(56,189,248,0.28)] bg-[rgba(56,189,248,0.1)] px-1.5 py-0 text-[0.58rem] font-bold text-[#38bdf8]"
            >
              Hoje
            </Badge>
          )}
        </div>
        {isOffDay ? (
          <Badge variant="outline" className="w-fit border-[rgba(229,235,241,0.12)] bg-[rgba(237,237,237,0.05)] px-2 py-0.5 text-[0.64rem] font-bold text-[#aeb7c2]">
            Dia off
          </Badge>
        ) : (
          <CaseCountBadge count={cases.length} />
        )}
        <small className="min-h-4 text-[0.64rem] leading-none text-[#aeb7c2]">
          {urgentCount > 0 ? `${urgentCount} urg.` : " "}
        </small>
      </button>
      <Button
        className="h-7 w-fit justify-self-end px-2 text-[#aeb7c2] hover:text-[#38bdf8]"
        variant="ghost"
        size="xs"
        type="button"
        aria-label={`Criar caso em ${formatWeekdayLabel(day)}`}
        onClick={() => onOpenNewCaseForDate(day)}
      >
        <Plus className="size-3.5" />
        <span className="sr-only">Criar caso</span>
      </Button>
    </div>
  );
}

export default function WeekSchedule({
  groupedCases,
  selectedDate,
  weekDays,
  weekStart,
  onPreviousWeek,
  onNextWeek,
  onSelectDate,
  onOpenNewCaseForDate,
}) {
  const weekHasCases = weekDays.some((day) => {
    const dayKey = getLocalDateKey(day);
    return (groupedCases.get(dayKey) || []).length > 0;
  });

  return (
    <Card className="gap-3 rounded-md border-[rgba(229,235,241,0.13)] bg-[rgba(25,30,38,0.96)] py-0 text-[#f3f4f6] shadow-sm">
      <CardHeader className="gap-1 px-4 pt-4 pb-0">
        <CardTitle className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#f3f4f6]">
          Semana de produção
        </CardTitle>
        <CardDescription className="text-[#aeb7c2]">Casos do dia na bancada.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 px-4 pb-4">
        <div className="grid grid-cols-[minmax(86px,0.3fr)_minmax(120px,1fr)_minmax(86px,0.3fr)] items-center gap-2 rounded-md border border-[rgba(229,235,241,0.13)] bg-[rgba(237,237,237,0.04)] p-1">
          <Button variant="outline" size="xs" type="button" onClick={onPreviousWeek}>
            ← Semana
          </Button>
          <strong className="truncate text-center text-sm font-semibold text-[#f3f4f6]">
            {formatWeekRange(weekStart)}
          </strong>
          <Button variant="outline" size="xs" type="button" onClick={onNextWeek}>
            Semana →
          </Button>
        </div>
        {weekHasCases ? (
          <div className="grid grid-cols-7 gap-2 max-[1120px]:grid-cols-4 max-[640px]:grid-flow-col max-[640px]:auto-cols-[minmax(128px,1fr)] max-[640px]:overflow-x-auto max-[640px]:pb-1" aria-label="Dias da semana">
            {weekDays.map((day) => {
              const dayKey = getLocalDateKey(day);
              const dayCases = groupedCases.get(dayKey) || [];

              return (
                <DayCard
                  key={dayKey}
                  day={day}
                  cases={dayCases}
                  selected={getLocalDateKey(selectedDate) === dayKey}
                  onSelect={onSelectDate}
                  onOpenNewCaseForDate={onOpenNewCaseForDate}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-14 flex-wrap items-center justify-center gap-3 rounded-md border border-dashed border-[rgba(229,235,241,0.13)] bg-[rgba(237,237,237,0.04)] p-3 text-sm font-semibold text-[#aeb7c2]">
            <span>Nenhum caso agendado nesta semana.</span>
            <Button
              variant="outline"
              size="xs"
              type="button"
              onClick={() => onOpenNewCaseForDate(selectedDate)}
            >
              <Plus className="size-3.5" />
              Criar caso em {formatWeekdayLabel(selectedDate)}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
