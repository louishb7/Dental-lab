import { Eye, Layers3 } from "lucide-react";
import Button from "../ui/Button.jsx";
import DeadlineBadge from "../ui/DeadlineBadge.jsx";
import PriorityBadge from "../ui/PriorityBadge.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import { formatCurrency } from "../../utils/formatters.js";

function formatItemsLabel(caseItem) {
  const count = caseItem.items_count ?? caseItem.items?.length ?? 0;
  return count ? `${count} ${count === 1 ? "item" : "itens"}` : "Sem itens";
}

export default function CaseBoardCard({ caseItem, onOpenCase }) {
  return (
    <article className="case-board-card">
      <div className="case-card-top">
        <div className="cell-main">
          <strong>{caseItem.patient_ref}</strong>
          <small>{caseItem.doctor_name}</small>
        </div>
        <div className="case-board-badges">
          <PriorityBadge priority={caseItem.priority} />
          <StatusBadge status={caseItem.status} />
        </div>
      </div>

      <div className="case-board-meta">
        <span className="case-board-info">
          <Layers3 size={14} />
          {formatItemsLabel(caseItem)}
        </span>
        <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
        <span className="case-board-value">{formatCurrency(caseItem.total_value)}</span>
      </div>

      <div className="case-board-actions">
        <Button variant="secondary" size="sm" onClick={() => onOpenCase(caseItem.id)}>
          <Eye size={16} />
          Ver caso
        </Button>
      </div>
    </article>
  );
}
