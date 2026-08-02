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

function DayCard({ day, cases, selected, onSelect, onOpenNewCaseForDate }) {
  const urgentCount = cases.filter((caseItem) => caseItem.priority === "urgent").length;
  const isCurrentDay = isToday(day);
  const isOffDay = cases.length === 0;

  return (
    <div
      className={[
        "grid min-h-[92px] min-w-0 gap-2 rounded-md border bg-card/70 p-2 text-card-foreground transition-colors",
        selected ? "border-primary/45 shadow-[inset_0_0_0_1px_rgba(255,138,42,0.18)]" : "border-border",
      ].join(" ")}
    >
      <button
        className="grid min-w-0 gap-2 text-left"
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(day)}
      >
        <div className="flex min-h-6 items-center justify-between gap-2">
          <span className="text-[0.68rem] font-bold uppercase text-muted-foreground">
            {formatWeekdayLabel(day)}
          </span>
          {isCurrentDay && (
            <Badge className="border-primary/25 bg-primary/10 px-1.5 py-0 text-[0.58rem] font-bold text-primary">
              Hoje
            </Badge>
          )}
        </div>
        {isOffDay ? (
          <Badge variant="secondary" className="w-fit border-border bg-muted px-2 py-0.5 text-[0.64rem] font-bold text-muted-foreground">
            Dia off
          </Badge>
        ) : (
          <strong className="text-sm font-semibold leading-tight text-foreground">
            {formatCaseCount(cases.length)}
          </strong>
        )}
        <small className="min-h-4 text-[0.64rem] leading-none text-muted-foreground">
          {urgentCount > 0 ? `${urgentCount} urg.` : " "}
        </small>
      </button>
      <Button
        className="h-7 w-fit justify-self-end px-2 text-muted-foreground hover:text-primary"
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
    <Card className="gap-3 rounded-md border-border bg-card/95 py-0 shadow-sm">
      <CardHeader className="gap-1 px-4 pt-4 pb-0">
        <CardTitle className="text-xs font-extrabold uppercase tracking-[0.08em] text-foreground">
          Semana de produção
        </CardTitle>
        <CardDescription>Casos do dia na bancada.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 px-4 pb-4">
        <div className="grid grid-cols-[minmax(86px,0.3fr)_minmax(120px,1fr)_minmax(86px,0.3fr)] items-center gap-2 rounded-md border border-border bg-muted p-1">
          <Button variant="outline" size="xs" type="button" onClick={onPreviousWeek}>
            ← Semana
          </Button>
          <strong className="truncate text-center text-sm font-semibold text-foreground">
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
          <div className="flex min-h-14 flex-wrap items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted p-3 text-sm font-semibold text-muted-foreground">
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
