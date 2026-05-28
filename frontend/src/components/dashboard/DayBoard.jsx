import EmptyState from "../ui/EmptyState.jsx";
import CaseBoardCard from "./CaseBoardCard.jsx";

export default function DayBoard({
  title,
  description,
  cases,
  onOpenCase,
}) {
  return (
    <section className="panel panel-strong">
      <div className="panel-header">
        <div className="panel-title">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="panel-body">
        {cases.length ? (
          <div className="day-board-grid">
            {cases.map((caseItem) => (
              <CaseBoardCard key={caseItem.id} caseItem={caseItem} onOpenCase={onOpenCase} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum caso para este dia."
            description="Crie um novo caso ou selecione outro dia da semana."
          />
        )}
      </div>
    </section>
  );
}
