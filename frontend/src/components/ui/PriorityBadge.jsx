import { Badge } from "./badge.jsx";

const PRIORITY_LABELS = {
  normal: "Normal",
  urgent: "Urgente",
};

export default function PriorityBadge({ priority }) {
  const normalized = priority || "normal";

  if (normalized === "normal") {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger-soft)]"
    >
      {PRIORITY_LABELS[normalized] || normalized}
    </Badge>
  );
}
