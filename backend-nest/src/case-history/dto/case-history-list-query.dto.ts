import { Transform, Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { CASE_STATUSES, type CaseStatus } from '../../case/case-rules';

export class CaseHistoryListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(75)
  limit = 25;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctor_id?: number;

  @IsOptional()
  @IsIn(CASE_STATUSES)
  status?: CaseStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  delivered_from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  delivered_to?: Date;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsIn(['true', 'false'])
  has_reverted?: 'true' | 'false';
}
