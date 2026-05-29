export default function PageContainer({ kicker, title, description, action, children }) {
  return (
    <section className="page-container">
      {action && (
        <div className="page-heading page-heading-actions-only">
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
