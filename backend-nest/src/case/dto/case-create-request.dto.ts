import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Validate } from 'class-validator';

import {
  CASE_PRIORITIES,
  CASE_STATUSES,
  PRICING_MODES,
  type CasePriority,
  type CaseStatus,
  type PricingMode,
} from '../case-rules';
import { CadistaDecimalValueConstraint } from './case-decimal.validator';

export class CaseCreateRequestDto {
  @IsInt()
  doctor_id!: number;

  @IsString()
  patient_ref!: string;

  @IsOptional()
  @IsIn(PRICING_MODES)
  pricing_mode?: PricingMode | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date | null;

  @IsOptional()
  @IsIn(CASE_PRIORITIES)
  priority: CasePriority = 'normal';

  @IsOptional()
  @IsIn(CASE_STATUSES)
  status: CaseStatus = 'pending';

  @IsOptional()
  @Validate(CadistaDecimalValueConstraint)
  total_value?: unknown;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
