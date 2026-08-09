import { Prisma } from '@prisma/client';

export function normalizeDecimalValue(value: unknown, errorMessage: string): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number') {
    return new Prisma.Decimal(String(value));
  }

  if (typeof value === 'string') {
    let normalized = value.trim();
    if (!normalized) {
      return null;
    }

    normalized = normalized.replace('R$', '').replaceAll(' ', '');
    if (normalized.includes(',')) {
      normalized = normalized.replaceAll('.', '').replace(',', '.');
    }

    try {
      const parsed = new Prisma.Decimal(normalized);
      if (parsed.greaterThan('99999999.99')) {
        throw new Error('Valor excede o limite (99999999.99)');
      }
      return parsed;
    } catch (error) {
      throw new Error(errorMessage, { cause: error });
    }
  }

  throw new Error(errorMessage);
}

export function isValidDecimalValue(value: unknown): boolean {
  try {
    normalizeDecimalValue(value, 'Valor inválido');
    return true;
  } catch {
    return false;
  }
}
