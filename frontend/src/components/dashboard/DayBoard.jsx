import EmptyState from "../ui/EmptyState.jsx";
import CaseBoardCard from "./CaseBoardCard.jsx";

export default function DayBoard({
  title,
  description,
  cases,
  onOpenCase,
}) {
  return (
    <section className="rounded-md border border-primary/30 bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="grid gap-1">
          <h3 className="text-base font-bold leading-tight">{title}</h3>
          <p className="text-sm leading-snug text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
      <div className="p-4">
        {cases.length ? (
          <div className="grid gap-2">
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
