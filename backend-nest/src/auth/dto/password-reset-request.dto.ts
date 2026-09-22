import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, Validate } from 'class-validator';
import { CadiskPasswordConstraint } from '../password-policy';

export class ForgotPasswordRequestDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;
}

export class ResetPasswordRequestDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'Link inválido ou expirado. Solicite novas instruções.' })
  token!: string;

  @IsString()
  @Validate(CadiskPasswordConstraint)
  password!: string;
}
