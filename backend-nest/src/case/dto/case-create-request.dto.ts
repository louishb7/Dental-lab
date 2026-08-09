import { Type } from 'class-transformer';
import { IsArray, IsDate, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength, Validate, ValidateNested } from 'class-validator';

import {
  CASE_PRIORITIES,
  CASE_STATUSES,
  PRICING_MODES,
  type CasePriority,
  type CaseStatus,
  type PricingMode,
} from '../case-rules';
import { CadiskDecimalValueConstraint } from './case-decimal.validator';
import { CaseItemCreateRequestDto } from '../../case-item/dto/case-item-create-request.dto';

export class CaseCreateRequestDto {
  @IsInt()
  @Min(1)
  doctor_id!: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
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
  @Validate(CadiskDecimalValueConstraint)
  total_value?: unknown;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaseItemCreateRequestDto)
  items?: CaseItemCreateRequestDto[];
}
