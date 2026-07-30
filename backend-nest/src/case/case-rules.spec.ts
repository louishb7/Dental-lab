import { Prisma } from '@prisma/client';

import { normalizeDecimalValue } from './case-money';
import { assertLinearStatusTransition, resolvePricingMode } from './case-rules';

describe('case money normalization', () => {
  it('normalizes legacy currency inputs', () => {
    expect(normalizeDecimalValue('1.234,56', 'Valor combinado inválido')?.toString()).toBe(
      '1234.56',
    );
    expect(normalizeDecimalValue('R$ 300,00', 'Valor combinado inválido')?.toString()).toBe('300');
    expect(normalizeDecimalValue(125.5, 'Valor combinado inválido')?.toString()).toBe('125.5');
    expect(normalizeDecimalValue('', 'Valor combinado inválido')).toBeNull();
    expect(normalizeDecimalValue(new Prisma.Decimal('10.20'), 'Valor combinado inválido')).toEqual(
      new Prisma.Decimal('10.20'),
    );
  });

  it('rejects invalid monetary values', () => {
    expect(() => normalizeDecimalValue('abc', 'Valor combinado inválido')).toThrow(
      'Valor combinado inválido',
    );
  });
});

describe('case business rules', () => {
  it('resolves pricing mode like the FastAPI service', () => {
    expect(resolvePricingMode(undefined, new Prisma.Decimal('100'))).toBe('fixed');
    expect(resolvePricingMode(undefined, null)).toBe('services');
    expect(resolvePricingMode(undefined, null, 'fixed')).toBe('fixed');
    expect(resolvePricingMode('services', new Prisma.Decimal('100'), 'fixed')).toBe('services');
  });

  it('allows only the linear status flow', () => {
    expect(() => assertLinearStatusTransition('pending', 'pending')).not.toThrow();
    expect(() => assertLinearStatusTransition('pending', 'completed')).not.toThrow();
    expect(() => assertLinearStatusTransition('completed', 'delivered')).not.toThrow();
    expect(() => assertLinearStatusTransition('pending', 'delivered')).toThrow(
      'Fluxo de status inválido',
    );
    expect(() => assertLinearStatusTransition('delivered', 'completed')).toThrow(
      'Fluxo de status inválido',
    );
  });
});
