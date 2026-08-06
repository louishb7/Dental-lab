import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import { CASE_STATUSES, type CaseStatus } from '../case-rules';

export class CaseListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 100;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  doctor_id?: number;

  @IsOptional()
  @IsIn(CASE_STATUSES)
  status?: CaseStatus;
}
