import { Badge } from "./badge.jsx";

const STATUS_LABELS = {
  pending: "Pendente",
  completed: "Pronto",
  delivered: "Entregue",
};

const STATUS_CLASSES = {
  pending: "border-[color-mix(in_srgb,var(--color-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] text-[var(--color-warning-soft)]",
  completed: "border-[color-mix(in_srgb,var(--color-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success-soft)]",
  delivered: "border-[color-mix(in_srgb,var(--color-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-info)_10%,transparent)] text-[var(--color-info-soft)]",
};

export default function StatusBadge({ status }) {
  const normalized = status || "pending";

  return (
    <Badge variant="outline" className={STATUS_CLASSES[normalized] || STATUS_CLASSES.pending}>
      {STATUS_LABELS[normalized] || normalized}
    </Badge>
  );
}
