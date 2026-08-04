import { IsOptional, IsString, Validate } from 'class-validator';

import { CadiskBrazilianPhoneConstraint } from './doctor-create-request.dto';

export class DoctorUpdateRequestDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  clinic_name?: string | null;

  @IsOptional()
  @IsString()
  @Validate(CadiskBrazilianPhoneConstraint)
  phone?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
