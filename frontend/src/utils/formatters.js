function parseCurrencyString(value) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!normalized) return null;

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma) {
    const amount = Number(normalized.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(amount) ? amount : null;
  }

  if (hasDot) {
    const parts = normalized.split(".");
    const lastPart = parts[parts.length - 1];
    const decimalLike = parts.length === 2 && lastPart.length <= 2;
    const amount = decimalLike
      ? Number(normalized)
      : Number(normalized.replace(/\./g, ""));
    return Number.isFinite(amount) ? amount : null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function formatCurrency(value) {
  const amount = typeof value === "number"
    ? value
    : parseCurrencyString(String(value ?? ""));

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
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  return parseCurrencyString(String(value ?? ""));
}

export function parseCurrencyToApiValue(value) {
  const amount = parseCurrencyToNumber(value);
  return amount === null ? null : Number(amount.toFixed(2));
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
  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  }

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

/**
 * Returns the operational label and tone used by deadline badges.
 *
 * @param {string|null|undefined} deadline Deadline returned by the API.
 * @param {string|null|undefined} status Case status.
 * @returns {{label: string, tone: "danger"|"warning"|"neutral"}}
 */
export function getDeadlineBadge(deadline, status) {
  if (!deadline) return { label: "Sem prazo", tone: "neutral" };
  if (status === "delivered") return { label: formatDate(deadline), tone: "neutral" };

  const relativeLabel = getRelativeDeadlineLabel(deadline);
  const tone = getDeadlineTone(deadline, status);

  if (relativeLabel === "Hoje") return { label: "Hoje", tone: "warning" };
  if (relativeLabel === "Amanhã") return { label: "Amanhã", tone: "neutral" };

  if (tone === "danger") return { label: formatDate(deadline), tone: "danger" };

  return { label: formatDate(deadline), tone: "neutral" };
}

export function formatDeadline(deadline, status) {
  const badge = getDeadlineBadge(deadline, status);
  return badge.label;
}
