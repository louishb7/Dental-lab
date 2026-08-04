import { IsString } from 'class-validator';

export class CaseRevertStatusRequestDto {
  @IsString()
  reason!: string;
}
