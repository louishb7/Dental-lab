import { Badge } from "./badge.jsx";

const STATUS_LABELS = {
  pending: "Pendente",
  completed: "Pronto",
  delivered: "Entregue",
};

const STATUS_CLASSES = {
  pending: "border-[var(--color-border)] bg-[var(--color-surface-soft)] text-[var(--color-text-soft)]",
  completed:
    "border-[color-mix(in_srgb,var(--color-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success-soft)]",
  delivered: "border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]",
};

export default function StatusBadge({ status }) {
  const normalized = status || "pending";

  return (
    <Badge variant="outline" className={STATUS_CLASSES[normalized] || STATUS_CLASSES.pending}>
      {STATUS_LABELS[normalized] || normalized}
    </Badge>
  );
}
