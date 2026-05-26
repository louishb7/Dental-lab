export function formatCurrency(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value) {
  if (!value) return "Sem prazo";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem prazo";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getDeadlineTone(deadline, status) {
  if (!deadline || status === "delivered") return "neutral";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(deadline);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return "danger";
  if (diffDays <= 2) return "warning";
  return "neutral";
}

export function formatDeadline(deadline, status) {
  const tone = getDeadlineTone(deadline, status);
  const label = formatDate(deadline);

  if (tone === "danger") return `${label} · Atrasado`;
  if (tone === "warning") return `${label} · Vence em breve`;
  return label;
}

