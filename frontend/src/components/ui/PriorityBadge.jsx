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
      className="border-[rgba(255,103,103,0.32)] bg-[rgba(255,103,103,0.12)] text-[#ffd3d3]"
    >
      {PRIORITY_LABELS[normalized] || normalized}
    </Badge>
  );
}
