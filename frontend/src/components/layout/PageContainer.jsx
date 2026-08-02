export default function PageContainer({ kicker, title, description, action, children }) {
  return (
    <section className="w-full max-w-[1560px] px-[var(--space-page-x)] py-3 pb-7">
      {action && (
        <div className="mb-3 flex min-h-10 items-end justify-end gap-4">
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
