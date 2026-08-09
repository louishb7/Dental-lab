import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength, Validate } from 'class-validator';

import { CaseItemDecimalValueConstraint } from './case-item-decimal.validator';
import { CaseItemQuantityConstraint } from './case-item-quantity.validator';
import { CaseItemToothConstraint } from './case-item-tooth.validator';

export class CaseItemUpdateRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @Validate(CaseItemToothConstraint)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  tooth?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  service_type?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Validate(CaseItemQuantityConstraint)
  quantity?: number | null;

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
