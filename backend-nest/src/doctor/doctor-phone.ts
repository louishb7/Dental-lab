const PHONE_PATTERN = /^\(\d{2}\)\d{4,5}-\d{4}$/;

export function normalizeBrazilianPhone(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (PHONE_PATTERN.test(normalized)) {
    return normalized;
  }

  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  throw new Error(
    'Telefone deve estar em branco ou seguir o padrão (xx)xxxx-xxxx / (xx)xxxxx-xxxx',
  );
}

export function isValidBrazilianPhone(value: string | null | undefined): boolean {
  try {
    normalizeBrazilianPhone(value);
    return true;
  } catch {
    return false;
  }
}
