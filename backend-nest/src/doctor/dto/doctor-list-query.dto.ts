import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class DoctorListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skip = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit = 100;
}
