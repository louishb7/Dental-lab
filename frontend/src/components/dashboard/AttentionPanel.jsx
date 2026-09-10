import { PackageCheck, Trash2 } from "lucide-react";
import Button from "../ui/Button.jsx";
import DeadlineBadge from "../ui/DeadlineBadge.jsx";
import EmptyState from "../ui/EmptyState.jsx";

export default function AttentionPanel({
  title,
  description,
  cases,
  emptyTitle,
  emptyIcon = PackageCheck,
  onOpenCase,
  onDeliverCase,
  onRemoveCase,
  className = "",
  showActions = false,
  showDeliverAction = showActions,
  showRemoveAction = showActions,
  discreetActions = false,
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] text-[var(--color-text)] ${className}`.trim()}
    >
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="grid gap-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold leading-tight">
            <PackageCheck size={16} className="text-[var(--color-text-muted)]" />
            {title}
            <span className="ml-auto text-xs tabular-nums text-[var(--color-text-muted)]">
              {cases.length}
            </span>
          </h2>
          <p className="text-sm leading-snug text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
      <div className="p-4">
        {cases.length ? (
          <div className="grid divide-y divide-[var(--color-border)]">
            {cases.map((caseItem) => (
              <article key={caseItem.id} className="grid gap-2 py-3 first:pt-0 last:pb-0">
                <button
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                  type="button"
                  onClick={() => onOpenCase(caseItem.id)}
                >
                  <span className="grid min-w-0 gap-1">
                    <strong className="break-words text-sm font-semibold">{caseItem.patient_ref}</strong>
                    <small className="break-words text-xs text-[var(--color-text-muted)]">
                      {caseItem.doctor_name}
                    </small>
                  </span>
                  <span className="shrink-0">
                    <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
                  </span>
                </button>
                {(showDeliverAction || showRemoveAction) && (
                  <span className="flex items-center justify-end gap-1.5">
                    {showRemoveAction && onRemoveCase && (
                      <Button
                        variant="danger"
                        iconOnly
                        aria-label="Excluir caso"
                        onClick={() => onRemoveCase(caseItem.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                    {showDeliverAction && onDeliverCase && (
                      <Button
                        variant={discreetActions ? "secondary" : "success"}
                        size="sm"
                        onClick={() => onDeliverCase(caseItem.id)}
                      >
                        <PackageCheck
                          className={discreetActions ? "text-[var(--color-success-soft)]" : ""}
                          size={14}
                        />
                        Entregar
                      </Button>
                    )}
                  </span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={emptyIcon} title={emptyTitle} description="Nada pendente neste bloco." />
        )}
      </div>
    </section>
  );
}
