export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="grid min-h-36 place-items-center gap-3 rounded-md border border-dashed border-[rgba(229,235,241,0.13)] bg-[rgba(237,237,237,0.03)] p-6 text-center text-[#aeb7c2]">
      {Icon && <Icon size={28} aria-hidden="true" className="text-[#aeb7c2]" />}
      <div className="grid gap-1">
        <h3 className="text-base font-bold text-[#f3f4f6]">{title}</h3>
        {description && <p className="text-sm leading-snug">{description}</p>}
      </div>
      {action}
    </div>
  );
}
