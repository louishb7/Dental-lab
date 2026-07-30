import { IsOptional, IsString, Validate } from 'class-validator';

import { CadistaBrazilianPhoneConstraint } from './doctor-create-request.dto';

export class DoctorUpdateRequestDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  clinic_name?: string | null;

  @IsOptional()
  @IsString()
  @Validate(CadistaBrazilianPhoneConstraint)
  phone?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
