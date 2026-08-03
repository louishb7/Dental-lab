import {
  formatDayMonth,
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

function CaseCountBadge({ count }) {
  return (
    <Badge
      variant="outline"
      className="h-5 w-fit border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1.5 py-0 text-[0.64rem] font-bold text-[var(--color-text)]"
    >
      {count}
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
        "grid min-h-[74px] min-w-0 grid-rows-[1fr_auto] gap-1 rounded-md border bg-[var(--color-elevated-bg)] p-1.5 text-[var(--color-text)] transition-colors",
        selected ? "border-primary/30 shadow-[inset_0_0_0_1px_var(--color-primary)]" : "border-[var(--color-border)]",
      ].join(" ")}
    >
      <button
        className="grid min-w-0 content-start gap-1 text-left"
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(day)}
      >
        <div className="flex min-h-5 items-center justify-between gap-1">
          <span className="text-[0.64rem] font-bold uppercase text-[var(--color-text-muted)]">
            {formatWeekdayLabel(day)}
          </span>
          {isCurrentDay && (
            <Badge
              variant="outline"
              className="h-4 border-primary/30 bg-primary/10 px-1 py-0 text-[0.55rem] font-bold text-primary"
            >
              Hoje
            </Badge>
          )}
        </div>
        <strong className="text-sm font-extrabold leading-none text-[var(--color-text)]">
          {formatDayMonth(day)}
        </strong>
        {isOffDay ? (
          <Badge variant="outline" className="h-5 w-fit border-[var(--color-border)] bg-[var(--color-subtle)] px-1.5 py-0 text-[0.6rem] font-bold text-[var(--color-text-muted)]">
            Dia off
          </Badge>
        ) : (
          <CaseCountBadge count={cases.length} />
        )}
        <small className="min-h-3 text-[0.58rem] leading-none text-[var(--color-text-muted)]">
          {urgentCount > 0 ? `${urgentCount} urg.` : " "}
        </small>
      </button>
      <Button
        className="h-5 w-fit justify-self-end px-1.5 text-[var(--color-text-muted)] hover:text-primary"
        variant="ghost"
        size="icon-xs"
        type="button"
        aria-label={`Criar caso em ${formatWeekdayLabel(day)}`}
        onClick={() => onOpenNewCaseForDate(day)}
      >
        <Plus className="size-3" />
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
  onOpenNewCase,
  onOpenNewCaseForDate,
}) {
  const weekHasCases = weekDays.some((day) => {
    const dayKey = getLocalDateKey(day);
    return (groupedCases.get(dayKey) || []).length > 0;
  });

  return (
    <Card className="gap-2 rounded-md border-[var(--color-border)] bg-[var(--color-surface)] py-0 text-[var(--color-text)] shadow-sm">
      <CardHeader className="grid gap-2 px-4 pt-4 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-text)]">
              Semana de produção
            </CardTitle>
            <CardDescription className="text-[var(--color-text-muted)]">Selecione um dia ou crie um caso direto no prazo.</CardDescription>
          </div>
          <Button variant="default" size="sm" type="button" onClick={onOpenNewCase}>
            <Plus className="size-3.5" />
            Novo caso
          </Button>
        </div>
        <div className="grid grid-cols-[minmax(76px,0.28fr)_minmax(120px,1fr)_minmax(76px,0.28fr)] items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] p-1">
          <Button variant="outline" size="xs" type="button" onClick={onPreviousWeek}>
            Anterior
          </Button>
          <strong className="truncate text-center text-xs font-semibold text-[var(--color-text)]">
            {formatWeekRange(weekStart)}
          </strong>
          <Button variant="outline" size="xs" type="button" onClick={onNextWeek}>
            Próxima
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 px-4 pb-4">
        {weekHasCases ? (
          <div className="grid grid-cols-7 gap-1.5 max-[1120px]:grid-flow-col max-[1120px]:auto-cols-[minmax(104px,1fr)] max-[1120px]:overflow-x-auto max-[1120px]:pb-1" aria-label="Dias da semana">
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
          <div className="flex min-h-14 flex-wrap items-center justify-center gap-3 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-subtle)] p-3 text-sm font-semibold text-[var(--color-text-muted)]">
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
