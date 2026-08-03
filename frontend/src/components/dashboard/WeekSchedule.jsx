import {
  formatDayMonth,
  formatWeekRange,
  formatWeekdayLabel,
  isToday,
} from "../../utils/productionWeek.js";
import { getLocalDateKey } from "../../utils/formatters.js";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.jsx";

function DayCard({ day, cases, selected, onSelect, onOpenNewCaseForDate }) {
  const urgentCount = cases.filter((caseItem) => caseItem.priority === "urgent").length;
  const isCurrentDay = isToday(day);

  return (
    <div
      className={[
        "grid min-h-[96px] min-w-0 grid-rows-[1fr_auto] gap-2 rounded-md border p-2.5 text-[var(--color-text)] transition-colors",
        selected
          ? "border-primary/40 bg-primary/10 shadow-[inset_0_0_0_1px_var(--color-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-elevated-bg)] hover:border-primary/30 hover:bg-primary/5",
      ].join(" ")}
    >
      <button
        className="grid min-w-0 content-start gap-2 text-left"
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(day)}
      >
        <div className="flex min-h-4 items-center justify-between gap-1">
          <span className="text-[0.66rem] font-extrabold uppercase text-[var(--color-text-muted)]">
            {formatWeekdayLabel(day)}
          </span>
          {isCurrentDay && !selected && (
            <span className="size-1.5 rounded-full bg-primary" aria-label="Hoje" />
          )}
        </div>
        <strong className="text-xl font-extrabold leading-none text-[var(--color-text)]">
          {formatDayMonth(day)}
        </strong>
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
          {cases.length} {cases.length === 1 ? "caso" : "casos"}
        </span>
        {urgentCount > 0 && (
          <Badge variant="outline" className="h-5 w-fit border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] px-1.5 py-0 text-[0.62rem] font-bold text-[var(--color-danger-soft)]">
            {urgentCount} urg.
          </Badge>
        )}
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
        <div className="grid grid-cols-[32px_minmax(120px,1fr)_32px] items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] p-1">
          <Button variant="outline" size="icon-xs" type="button" aria-label="Semana anterior" onClick={onPreviousWeek}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <strong className="truncate text-center text-sm font-extrabold text-[var(--color-text)]">
            {formatWeekRange(weekStart)}
          </strong>
          <Button variant="outline" size="icon-xs" type="button" aria-label="Próxima semana" onClick={onNextWeek}>
            <ChevronRight className="size-3.5" />
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
