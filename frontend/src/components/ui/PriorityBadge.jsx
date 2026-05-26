const PRIORITY_LABELS = {
  normal: "Normal",
  urgent: "Urgente",
};

export default function PriorityBadge({ priority }) {
  const normalized = priority || "normal";

  return (
    <span className={`badge badge-priority ${normalized}`}>
      {PRIORITY_LABELS[normalized] || normalized}
    </span>
  );
}

