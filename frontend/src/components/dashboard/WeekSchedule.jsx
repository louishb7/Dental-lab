import { AlertTriangle } from "lucide-react";
import {
  formatDayMonth,
  formatWeekRange,
  formatWeekdayLabel,
  isToday,
} from "../../utils/productionWeek.js";
import { getLocalDateKey } from "../../utils/formatters.js";

function formatCaseCount(count) {
  return `${count} ${count === 1 ? "caso" : "casos"}`;
}

function DayCard({ day, cases, selected, onSelect }) {
  const urgentCount = cases.filter((caseItem) => caseItem.priority === "urgent").length;
  const isCurrentDay = isToday(day);
  const isOffDay = cases.length === 0;

  return (
    <button
      className={[
        "week-day-card",
        selected ? "selected" : "",
        isCurrentDay ? "today" : "",
        isOffDay ? "off" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(day)}
    >
      <div className="week-day-top">
        <span className="week-day-label">{formatWeekdayLabel(day)}</span>
        {isCurrentDay && <span className="week-day-marker">Hoje</span>}
      </div>
      <strong>{formatDayMonth(day)}</strong>
      <small>{cases.length ? formatCaseCount(cases.length) : "DIA OFF"}</small>
      {urgentCount > 0 && (
        <span className="week-day-alert">
          <AlertTriangle size={12} />
          {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
        </span>
      )}
    </button>
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
}) {
  return (
    <section className="panel panel-strong">
      <div className="panel-header week-panel-header">
        <button className="button button-secondary button-sm" type="button" onClick={onPreviousWeek}>
          ← Semana
        </button>
        <div className="panel-title week-panel-title">
          <h3>Semana de produção</h3>
          <p>Selecione um dia para ver só os casos daquela data.</p>
          <strong className="week-range-label">{formatWeekRange(weekStart)}</strong>
        </div>
        <button className="button button-secondary button-sm" type="button" onClick={onNextWeek}>
          Semana →
        </button>
      </div>
      <div className="panel-body">
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
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
