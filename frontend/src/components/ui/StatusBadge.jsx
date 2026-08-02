import { Badge } from "./badge.jsx";

const STATUS_LABELS = {
  pending: "Pendente",
  completed: "Pronto",
  delivered: "Entregue",
};

const STATUS_CLASSES = {
  pending: "border-[rgba(242,185,73,0.32)] bg-[rgba(242,185,73,0.12)] text-[#ffe5a9]",
  completed: "border-[rgba(115,201,143,0.28)] bg-[rgba(115,201,143,0.12)] text-[#d5f8e0]",
  delivered: "border-[rgba(138,180,255,0.28)] bg-[rgba(138,180,255,0.1)] text-[#d6e5ff]",
};

export default function StatusBadge({ status }) {
  const normalized = status || "pending";

  return (
    <Badge variant="outline" className={STATUS_CLASSES[normalized] || STATUS_CLASSES.pending}>
      {STATUS_LABELS[normalized] || normalized}
    </Badge>
  );
}
