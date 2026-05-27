import { getDeadlineBadge } from "../../utils/formatters.js";

export default function DeadlineBadge({ deadline, status }) {
  const badge = getDeadlineBadge(deadline, status);

  return (
    <span className={`badge badge-deadline ${badge.tone}`}>
      {badge.label}
    </span>
  );
}
