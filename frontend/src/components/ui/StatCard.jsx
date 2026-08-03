import { Card, CardContent } from "./card.jsx";
import { cn } from "../../lib/utils.js";

const TONE_CLASSES = {
  info: {
    icon: "bg-[color-mix(in_srgb,var(--color-info)_12%,transparent)] text-[var(--color-info-soft)]",
  },
  warning: {
    icon: "bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] text-[var(--color-warning-soft)]",
  },
  success: {
    icon: "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success-soft)]",
  },
  danger: {
    icon: "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger-soft)]",
  },
};

export default function StatCard({ title, value, description, icon: Icon, tone = "info", compact = false }) {
  const toneClasses = TONE_CLASSES[tone] || TONE_CLASSES.info;

  return (
    <Card className="rounded-md border-[var(--color-border)] bg-[var(--color-surface)] py-0 text-[var(--color-text)] shadow-sm">
      <CardContent className={cn("grid", compact ? "gap-2 p-3" : "gap-3 p-4")}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{title}</span>
          {Icon && (
            <span
              className={cn("grid place-items-center rounded-md", compact ? "size-7" : "size-9", toneClasses.icon)}
              aria-hidden="true"
            >
              <Icon size={compact ? 16 : 20} />
            </span>
          )}
        </div>
        <strong className={cn("font-bold leading-none", compact ? "text-2xl" : "text-3xl")}>{value}</strong>
        {description && (
          <p className={cn("leading-snug text-[var(--color-text-muted)]", compact ? "text-xs" : "text-sm")}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
