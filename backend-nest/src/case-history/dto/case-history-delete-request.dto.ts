import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

export class CaseHistoryDeleteRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  case_ids!: number[];
}
