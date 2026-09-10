import { ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { formatWeekRange, isToday } from "../../utils/productionWeek.js";
import { getLocalDateKey } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";

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
  const selectedKey = getLocalDateKey(selectedDate);
  const weekCount = weekDays.reduce(
    (count, day) => count + (groupedCases.get(getLocalDateKey(day)) || []).length,
    0,
  );
  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      aria-label="Semana de produção"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-semibold">Semana de produção</h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {weekCount} {weekCount === 1 ? "trabalho agendado" : "trabalhos agendados"}
          </p>
        </div>
        <Button variant="primary" onClick={onOpenNewCase}>
          <Plus size={16} />
          Novo caso
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 border-y border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1">
        <Button variant="ghost" iconOnly aria-label="Semana anterior" onClick={onPreviousWeek}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-xs font-medium tabular-nums">{formatWeekRange(weekStart)}</span>
        <Button variant="ghost" iconOnly aria-label="Próxima semana" onClick={onNextWeek}>
          <ChevronRight size={16} />
        </Button>
      </div>
      <div className="grid grid-cols-7 divide-x divide-[var(--color-border)]" aria-label="Dias da semana">
        {weekDays.map((day) => {
          const key = getLocalDateKey(day);
          const dayCases = groupedCases.get(key) || [];
          const urgentCount = dayCases.filter((item) => item.priority === "urgent").length;
          const selected = selectedKey === key;
          const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", "");
          return (
            <div key={key} className={`relative min-w-0 ${selected ? "bg-primary/8" : ""}`}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`${new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(day)}, ${dayCases.length} casos${urgentCount ? `, ${urgentCount} urgentes` : ""}`}
                onClick={() => onSelectDate(day)}
                className={`grid min-h-24 w-full justify-items-center gap-1 border-t-2 px-1 py-2 transition-colors hover:bg-primary/5 ${selected ? "border-primary" : "border-transparent"}`}
              >
                <span
                  className={`text-[11px] capitalize ${selected ? "font-semibold text-primary" : "text-[var(--color-text-muted)]"}`}
                >
                  {label}
                </span>
                <span
                  className={`grid size-7 place-items-center rounded-full text-base font-semibold tabular-nums ${isToday(day) ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {day.getDate()}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  <strong className="font-semibold text-[var(--color-text)]">{dayCases.length}</strong>
                  <span className="hidden sm:inline"> {dayCases.length === 1 ? "caso" : "casos"}</span>
                </span>
                <span
                  className={`size-1.5 rounded-full ${urgentCount ? "bg-[var(--color-danger)]" : "bg-transparent"}`}
                  aria-hidden="true"
                />
              </button>
              <div className="hidden justify-center pb-2 sm:flex">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Criar caso em ${day.toLocaleDateString("pt-BR")}`}
                  onClick={() => onOpenNewCaseForDate(day)}
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)]">
        <Link
          to="/cases"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm font-medium text-[var(--color-text-soft)] underline-offset-4 hover:text-primary hover:underline sm:min-h-9"
        >
          Todos os casos <ArrowRight size={14} />
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary sm:hidden"
          onClick={() => onOpenNewCaseForDate(selectedDate)}
          aria-label="Criar caso no dia selecionado"
        >
          <Plus size={14} />
          Neste dia
        </Button>
      </div>
    </section>
  );
}
