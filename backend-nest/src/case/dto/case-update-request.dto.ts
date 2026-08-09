import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength, Validate } from 'class-validator';

import { CASE_PRIORITIES, CASE_STATUSES, type CasePriority, type CaseStatus } from '../case-rules';
import { CadiskDecimalValueConstraint } from './case-decimal.validator';

export class CaseUpdateRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  doctor_id?: number | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  patient_ref?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date | null;

  @IsOptional()
  @IsIn(CASE_PRIORITIES)
  priority?: CasePriority | null;

  @IsOptional()
  @IsIn(CASE_STATUSES)
  status?: CaseStatus | null;

  @IsOptional()
  @Validate(CadiskDecimalValueConstraint)
  total_value?: unknown;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  status_revert_reason?: string | null;
}
