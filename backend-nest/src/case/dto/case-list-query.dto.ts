import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

import { CASE_STATUSES, type CaseStatus } from '../case-rules';

export class CaseListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skip = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit = 100;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctor_id?: number;

  @IsOptional()
  @IsIn(CASE_STATUSES)
  status?: CaseStatus;
}
