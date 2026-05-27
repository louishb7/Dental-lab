const STATUS_LABELS = {
  pending: "Pendente",
  completed: "Pronto",
  delivered: "Entregue",
};

export default function StatusBadge({ status }) {
  const normalized = status || "pending";

  return (
    <span className={`badge badge-status ${normalized}`}>
      {STATUS_LABELS[normalized] || normalized}
    </span>
  );
}
