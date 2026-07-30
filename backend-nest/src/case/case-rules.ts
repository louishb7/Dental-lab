import type { Prisma } from '@prisma/client';

export const PRICING_MODES = ['fixed', 'services'] as const;
export const CASE_PRIORITIES = ['normal', 'urgent'] as const;
export const CASE_STATUSES = ['pending', 'completed', 'delivered'] as const;

export type PricingMode = (typeof PRICING_MODES)[number];
export type CasePriority = (typeof CASE_PRIORITIES)[number];
export type CaseStatus = (typeof CASE_STATUSES)[number];

const STATUS_INDEX: Record<CaseStatus, number> = {
  pending: 0,
  completed: 1,
  delivered: 2,
};

export function resolvePricingMode(
  pricingMode: string | null | undefined,
  totalValue: Prisma.Decimal | null,
  currentMode?: string | null,
): PricingMode {
  const resolvedMode = pricingMode ?? currentMode ?? (totalValue !== null ? 'fixed' : 'services');

  if (resolvedMode !== 'fixed' && resolvedMode !== 'services') {
    throw new Error('Modo de cobrança inválido');
  }

  return resolvedMode;
}

export function assertLinearStatusTransition(
  currentStatus: string,
  targetStatus: CaseStatus,
): void {
  if (!isCaseStatus(currentStatus)) {
    throw new Error('Status atual inválido.');
  }

  const currentIndex = STATUS_INDEX[currentStatus];
  const targetIndex = STATUS_INDEX[targetStatus];

  if (targetIndex < currentIndex || targetIndex > currentIndex + 1) {
    throw new Error('Fluxo de status inválido. Use pending -> completed -> delivered.');
  }
}

export function isCaseStatus(status: string): status is CaseStatus {
  return status === 'pending' || status === 'completed' || status === 'delivered';
}
