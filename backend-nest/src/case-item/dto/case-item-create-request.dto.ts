import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Validate } from 'class-validator';

import { CaseItemDecimalValueConstraint } from './case-item-decimal.validator';
import { CaseItemQuantityConstraint } from './case-item-quantity.validator';
import { CaseItemToothConstraint } from './case-item-tooth.validator';

export class CaseItemCreateRequestDto {
  @IsString()
  @Validate(CaseItemToothConstraint)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  tooth!: string;

  @IsString()
  service_type!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Validate(CaseItemQuantityConstraint)
  quantity?: number;

  @IsOptional()
  @Validate(CaseItemDecimalValueConstraint)
  unit_value?: unknown;

  @IsOptional()
  @IsString()
  material?: string | null;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
