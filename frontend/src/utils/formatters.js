export function formatCurrency(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatCurrencyInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";

  const amount = Number(digits) / 100;
  return formatCurrency(amount);
}

export function parseCurrencyToNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;

  return Number(digits) / 100;
}

export function parseCurrencyToApiValue(value) {
  const amount = parseCurrencyToNumber(value);
  return amount === null ? null : amount.toFixed(2);
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

export function getLocalDateKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRelativeDeadlineLabel(deadline) {
  if (!deadline) return null;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const deadlineKey = getLocalDateKey(deadline);
  if (deadlineKey === getLocalDateKey(today)) return "Hoje";
  if (deadlineKey === getLocalDateKey(tomorrow)) return "Amanhã";
  return null;
}

export function formatDeadline(deadline, status) {
  const tone = getDeadlineTone(deadline, status);
  const label = formatDate(deadline);

  if (tone === "danger") return `${label} · Atrasado`;
  if (tone === "warning") return `${label} · Vence em breve`;
  return label;
}
