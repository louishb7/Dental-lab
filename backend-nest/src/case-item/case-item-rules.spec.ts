import { Prisma } from '@prisma/client';

import { normalizeDecimalValue } from '../case/case-money';
import { assertValidQuantity, normalizeTooth } from './case-item-rules';

describe('case item rules', () => {
  it('normalizes and validates tooth values', () => {
    expect(normalizeTooth(' 11 ')).toBe('11');
    expect(normalizeTooth('protocolo total')).toBe('protocolo total');
    expect(() => normalizeTooth('')).toThrow('O campo tooth não pode ser vazio');
    expect(() => normalizeTooth('10')).toThrow(
      'Número do dente inválido',
    );
    expect(() => normalizeTooth('49')).toThrow(
      'Número do dente inválido',
    );
  });

  it('validates positive quantities', () => {
    expect(() => assertValidQuantity(1)).not.toThrow();
    expect(() => assertValidQuantity(undefined)).not.toThrow();
    expect(() => assertValidQuantity(null)).not.toThrow();
    expect(() => assertValidQuantity(0)).toThrow('Quantidade deve ser maior ou igual a 1');
  });

  it('reuses legacy money normalization for unit values', () => {
    const normalized = normalizeDecimalValue('R$ 1.234,56', 'Valor unitário inválido');

    expect(normalized).toBeInstanceOf(Prisma.Decimal);
    expect(normalized?.toString()).toBe('1234.56');
    expect(normalizeDecimalValue('', 'Valor unitário inválido')).toBeNull();
    expect(() => normalizeDecimalValue('abc', 'Valor unitário inválido')).toThrow(
      'Valor unitário inválido',
    );
  });
});
