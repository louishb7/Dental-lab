export function normalizeTooth(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('O campo tooth não pode ser vazio');
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error('O campo tooth não pode ser vazio');
  }

  if (/^\d+$/.test(normalized)) {
    if (!/^(?:[1-4][1-8])$/.test(normalized)) {
      throw new Error(
        'Número do dente inválido. Deve estar no padrão FDI permanente (ex: 11-18, 21-28, 31-38, 41-48).',
      );
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
