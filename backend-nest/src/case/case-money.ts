import { Prisma } from '@prisma/client';
import { UnprocessableEntityException } from '@nestjs/common';

export function normalizeDecimalValue(value: unknown, errorMessage: string): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'object' && !(value instanceof Prisma.Decimal)) {
    throw new UnprocessableEntityException(errorMessage);
  }

  let strValue: string;

  if (value instanceof Prisma.Decimal) {
    strValue = value.toString();
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new UnprocessableEntityException(errorMessage);
    }
    strValue = value.toString();
  } else if (typeof value === 'string') {
    let normalized = value.trim();
    if (!normalized) {
      return null;
    }

    if (/e/i.test(normalized)) {
      throw new UnprocessableEntityException(errorMessage);
    }

    normalized = normalized.replace('R$', '').replaceAll(' ', '');
    if (normalized.includes(',')) {
      normalized = normalized.replaceAll('.', '').replace(',', '.');
    }
    strValue = normalized;
  } else {
    throw new UnprocessableEntityException(errorMessage);
  }

  if (/e/i.test(strValue)) {
    throw new UnprocessableEntityException(errorMessage);
  }

  try {
    const parsed = new Prisma.Decimal(strValue);

    if (parsed.isNegative()) {
      throw new UnprocessableEntityException(errorMessage);
    }
    if (parsed.isNaN() || !parsed.isFinite()) {
      throw new UnprocessableEntityException(errorMessage);
    }
    if (parsed.greaterThan('99999999.99')) {
      throw new UnprocessableEntityException(errorMessage);
    }
    if (parsed.decimalPlaces() > 2) {
      throw new UnprocessableEntityException(errorMessage);
    }

    return parsed;
  } catch (error) {
    if (error instanceof UnprocessableEntityException) {
      throw error;
    }
    throw new UnprocessableEntityException(errorMessage, { cause: error });
  }
}

export function isValidDecimalValue(value: unknown): boolean {
  try {
    normalizeDecimalValue(value, 'Valor inválido');
    return true;
  } catch {
    return false;
  }
}
