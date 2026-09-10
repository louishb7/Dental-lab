import EmptyState from "../ui/EmptyState.jsx";
import CaseBoardCard from "./CaseBoardCard.jsx";

export default function DayBoard({
  title,
  description,
  cases,
  onOpenCase,
  onAdvanceCase,
  showReadyAction = false,
}) {
  return (
    <section className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          <p className="text-sm leading-snug text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
      <div className="px-4 py-1">
        {cases.length ? (
          <div className="divide-y divide-[var(--color-border)]">
            {cases.map((caseItem) => (
              <CaseBoardCard
                key={caseItem.id}
                caseItem={caseItem}
                onOpenCase={onOpenCase}
                onAdvanceCase={onAdvanceCase}
                showReadyAction={showReadyAction}
              />
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
