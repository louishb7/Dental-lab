export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="grid min-h-36 place-items-center gap-3 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-subtle)] p-6 text-center text-[var(--color-text-muted)]">
      {Icon && <Icon size={28} aria-hidden="true" className="text-[var(--color-text-muted)]" />}
      <div className="grid gap-1">
        <h3 className="text-base font-bold text-[var(--color-text)]">{title}</h3>
        {description && <p className="text-sm leading-snug">{description}</p>}
      </div>
      {action}
    </div>
  );
}
