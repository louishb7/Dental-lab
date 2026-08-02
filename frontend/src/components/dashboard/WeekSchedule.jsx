import {
  formatWeekRange,
  formatWeekdayLabel,
  isToday,
} from "../../utils/productionWeek.js";
import { getLocalDateKey } from "../../utils/formatters.js";

function formatCaseCount(count) {
  return `${count} ${count === 1 ? "caso" : "casos"}`;
}

function DayCard({ day, cases, selected, onSelect, onOpenNewCaseForDate }) {
  const urgentCount = cases.filter((caseItem) => caseItem.priority === "urgent").length;
  const isCurrentDay = isToday(day);
  const isOffDay = cases.length === 0;
  const summary = isOffDay ? "DIA OFF" : `${formatCaseCount(cases.length)}`;

  return (
    <div
      className={[
        "week-day-card",
        selected ? "selected" : "",
        isCurrentDay ? "today" : "",
        isOffDay ? "off" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        className="week-day-select"
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(day)}
      >
        <div className="week-day-top">
          <span className="week-day-label">{formatWeekdayLabel(day)}</span>
          {isCurrentDay && <span className="week-day-marker">Hoje</span>}
        </div>
        <strong className="week-day-summary">{summary}</strong>
        <small className="week-day-urgent">{urgentCount > 0 ? `${urgentCount} urg.` : " "}</small>
      </button>
      <button
        className="week-day-add"
        type="button"
        aria-label={`Criar caso em ${formatWeekdayLabel(day)}`}
        onClick={() => onOpenNewCaseForDate(day)}
      >
        + Caso
      </button>
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
    <section className="panel panel-strong week-schedule-panel">
      <div className="panel-header">
        <div className="panel-title">
          <h3>Semana de produção</h3>
          <p>Casos do dia na bancada.</p>
        </div>
      </div>
      <div className="panel-body week-panel-body">
        <div className="week-panel-nav">
          <button className="button button-secondary button-sm" type="button" onClick={onPreviousWeek}>
            ← Semana
          </button>
          <strong className="week-range-label">{formatWeekRange(weekStart)}</strong>
          <button className="button button-secondary button-sm" type="button" onClick={onNextWeek}>
            Semana →
          </button>
        </div>
        {weekHasCases ? (
          <div className="week-days-grid" aria-label="Dias da semana">
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
          <div className="week-empty-state">
            <span>Nenhum caso agendado nesta semana.</span>
            <button
              className="button button-secondary button-sm"
              type="button"
              onClick={() => onOpenNewCaseForDate(selectedDate)}
            >
              Criar caso em {formatWeekdayLabel(selectedDate)}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
