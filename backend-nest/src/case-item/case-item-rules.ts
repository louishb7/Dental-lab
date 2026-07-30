export function normalizeTooth(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('O campo tooth não pode ser vazio');
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error('O campo tooth não pode ser vazio');
  }

  if (/^\d+$/.test(normalized)) {
    const toothNumber = Number.parseInt(normalized, 10);
    if (toothNumber < 11 || toothNumber > 48) {
      throw new Error('Quando numérico, o campo tooth deve estar entre 11 e 48');
    }
  }

  return normalized;
}

export function isValidTooth(value: unknown): boolean {
  try {
    normalizeTooth(value);
    return true;
  } catch {
    return false;
  }
}

export function assertValidQuantity(value: number | null | undefined): void {
  if (value !== null && value !== undefined && value < 1) {
    throw new Error('Quantidade deve ser maior ou igual a 1');
  }
}
