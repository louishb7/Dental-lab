import { getDeadlineBadge } from "../../utils/formatters.js";
import { Badge } from "./badge.jsx";

const TONE_CLASSES = {
  neutral: "border-[var(--color-border)] bg-[var(--color-subtle)] text-[var(--color-text-muted)]",
  success: "border-[color-mix(in_srgb,var(--color-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success-soft)]",
  warning: "border-[color-mix(in_srgb,var(--color-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] text-[var(--color-warning-soft)]",
  danger: "border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger-soft)]",
  info: "border-[color-mix(in_srgb,var(--color-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-info)_10%,transparent)] text-[var(--color-info-soft)]",
};

export default function DeadlineBadge({ deadline, status }) {
  const badge = getDeadlineBadge(deadline, status);

  return (
    <Badge variant="outline" className={TONE_CLASSES[badge.tone] || TONE_CLASSES.neutral}>
      {badge.label}
    </Badge>
  );
}
