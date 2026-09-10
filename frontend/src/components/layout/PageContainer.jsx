const WIDTHS = { wide: "max-w-[1320px]", medium: "max-w-[840px]", finance: "max-w-[1160px]" };

export default function PageContainer({ title, description, action, children, width = "wide" }) {
  return (
    <section className={`mx-auto w-full px-[var(--space-page-x)] py-5 pb-10 ${WIDTHS[width] || WIDTHS.wide}`}>
      {action && (
        <div className="mb-5 flex min-h-10 items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-semibold">{title}</h2>
            {description && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
