import type { ICaseRepository, CaseWithItems } from './case.repository';
import type { CaseUpdateRequestDto } from './dto/case-update-request.dto';
import type { PricingMode } from './case-rules';
import type { Prisma } from '@prisma/client';

export interface PricingOptions {
  totalValueProvided: boolean;
  newTotalValue: Prisma.Decimal | null;
  targetPricingMode: PricingMode;
}

export abstract class PricingStrategy {
  abstract calculateValue(
    currentCase: CaseWithItems,
    input: CaseUpdateRequestDto,
    repo: ICaseRepository
  ): Promise<Prisma.Decimal | null>;
}

export class FixedPricingStrategy extends PricingStrategy {
  constructor(private readonly newTotalValue: Prisma.Decimal | null) {
    super();
  }

  async calculateValue(): Promise<Prisma.Decimal | null> {
    if (this.newTotalValue === null) {
      throw new Error('Informe o valor fixo para este caso.');
    }
    return this.newTotalValue;
  }
}

export class ServicesPricingStrategy extends PricingStrategy {
  constructor(
    private readonly newTotalValue: Prisma.Decimal | null,
    private readonly totalValueProvided: boolean
  ) {
    super();
  }

  async calculateValue(
    currentCase: CaseWithItems,
    input: CaseUpdateRequestDto,
    repo: ICaseRepository
  ): Promise<Prisma.Decimal | null> {
    if (this.totalValueProvided) {
      if (this.newTotalValue !== null) {
        throw new Error('Casos por serviços não usam valor combinado.');
      }
      return repo.sumCaseItemValues(currentCase.id);
    }
    
    if (this.hasNonStatusCaseUpdate(input)) {
      return repo.sumCaseItemValues(currentCase.id);
    }
    
    // Fallback: keep existing value if no relevant updates
    return currentCase.totalValue;
  }

  private hasNonStatusCaseUpdate(input: CaseUpdateRequestDto): boolean {
    return (
      input.doctor_id !== undefined ||
      input.patient_ref !== undefined ||
      input.deadline !== undefined ||
      input.priority !== undefined ||
      input.notes !== undefined
    );
  }
}

export function createPricingStrategy(
  pricing: PricingOptions
): PricingStrategy | null {
  if (pricing.targetPricingMode === 'fixed' && pricing.totalValueProvided) {
    return new FixedPricingStrategy(pricing.newTotalValue);
  }
  
  if (pricing.targetPricingMode === 'services') {
    return new ServicesPricingStrategy(pricing.newTotalValue, pricing.totalValueProvided);
  }
  
  return null;
}
