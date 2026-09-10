import { Eye, Layers3, PackageCheck } from "lucide-react";
import Button from "../ui/Button.jsx";
import DeadlineBadge from "../ui/DeadlineBadge.jsx";
import PriorityBadge from "../ui/PriorityBadge.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import { formatCurrency } from "../../utils/formatters.js";
import { formatServiceItemCount, getServiceCount } from "../../utils/cases.js";

function formatItemsLabel(caseItem) {
  const count = getServiceCount(caseItem);
  return count ? formatServiceItemCount(caseItem) : "Sem itens de serviço";
}

export default function CaseBoardCard({ caseItem, onOpenCase, onAdvanceCase, showReadyAction = false }) {
  const canMarkReady = showReadyAction && caseItem.status === "pending" && onAdvanceCase;

  return (
    <article className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex items-start justify-between gap-3 sm:col-span-2">
        <div className="grid min-w-0 gap-1">
          <button
            type="button"
            className="break-words text-left text-sm font-semibold text-[var(--color-text)] underline-offset-4 hover:text-primary hover:underline"
            onClick={() => onOpenCase(caseItem.id)}
          >
            {caseItem.patient_ref}
          </button>
          <small className="break-words text-xs text-[var(--color-text-muted)]">{caseItem.doctor_name}</small>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <PriorityBadge priority={caseItem.priority} />
          <StatusBadge status={caseItem.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Layers3 size={13} />
          {formatItemsLabel(caseItem)}
        </span>
        <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
        <span className="ml-auto font-bold text-[var(--color-text)]">
          {formatCurrency(caseItem.total_value)}
        </span>
      </div>

      <div className="flex justify-end gap-1.5">
        {canMarkReady && (
          <Button
            variant="secondary"
            size="sm"
            aria-label="Marcar como pronto"
            title="Marcar como pronto"
            onClick={() => onAdvanceCase(caseItem)}
          >
            <PackageCheck className="text-[var(--color-success-soft)]" size={14} />
            Pronto
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onOpenCase(caseItem.id)}>
          <Eye size={14} />
          Abrir
        </Button>
      </div>
    </article>
  );
}
