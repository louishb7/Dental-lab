export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="state-box">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

