import { IsOptional, IsString, Validate } from 'class-validator';
import { type ValidatorConstraintInterface, ValidatorConstraint } from 'class-validator';

import { isValidBrazilianPhone } from '../doctor-phone';

@ValidatorConstraint({ name: 'cadistaBrazilianPhone', async: false })
export class CadistaBrazilianPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    return typeof value === 'string' && isValidBrazilianPhone(value);
  }

  defaultMessage(): string {
    return 'Value error, Telefone deve estar em branco ou seguir o padrão (xx)xxxx-xxxx / (xx)xxxxx-xxxx';
  }
}

export class DoctorCreateRequestDto {
  @IsString()
  name!: string;

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
