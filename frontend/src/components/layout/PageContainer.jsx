export default function PageContainer({ kicker, title, description, action, children }) {
  return (
    <section className="page-container">
      {(title || description || action) && (
        <div className="page-heading">
          <div>
            {kicker && <span className="page-kicker">{kicker}</span>}
            {title && <h2>{title}</h2>}
            {description && <p className="muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

