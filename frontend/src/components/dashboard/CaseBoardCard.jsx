import { Eye, Layers3 } from "lucide-react";
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

export default function CaseBoardCard({ caseItem, onOpenCase }) {
  return (
    <article className="grid gap-2 rounded-md border border-[rgba(229,235,241,0.13)] bg-[rgba(237,237,237,0.04)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <strong className="truncate text-sm font-bold text-[#f3f4f6]">{caseItem.patient_ref}</strong>
          <small className="truncate text-xs text-[#aeb7c2]">{caseItem.doctor_name}</small>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <PriorityBadge priority={caseItem.priority} />
          <StatusBadge status={caseItem.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[#aeb7c2]">
        <span className="inline-flex items-center gap-1.5">
          <Layers3 size={13} />
          {formatItemsLabel(caseItem)}
        </span>
        <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
        <span className="ml-auto font-bold text-[#f3f4f6]">{formatCurrency(caseItem.total_value)}</span>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => onOpenCase(caseItem.id)}>
          <Eye size={14} />
          Abrir
        </Button>
      </div>
    </article>
  );
}
