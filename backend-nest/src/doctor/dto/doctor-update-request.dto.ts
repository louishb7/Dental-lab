import { IsNotEmpty, IsOptional, IsString, MinLength, Validate } from 'class-validator';

import { CadiskBrazilianPhoneConstraint } from './doctor-create-request.dto';

export class DoctorUpdateRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
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
