import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional } from 'class-validator';

export class CaseBulkDeliverRequestDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  case_ids: number[] = [];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctor_id?: number | null;
}
