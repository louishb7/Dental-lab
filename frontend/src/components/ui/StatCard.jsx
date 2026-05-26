export default function StatCard({ title, value, description, icon: Icon, tone = "info" }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-card-header">
        <span>{title}</span>
        {Icon && (
          <span className="stat-icon" aria-hidden="true">
            <Icon size={20} />
          </span>
        )}
      </div>
      <strong>{value}</strong>
      {description && <p>{description}</p>}
    </article>
  );
}

