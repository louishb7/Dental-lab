import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, Validate } from 'class-validator';
import {
  type ValidationArguments,
  type ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

@ValidatorConstraint({ name: 'cadistaUsername', async: false })
class CadistaUsernameConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const normalized = value.trim();
    return (
      normalized.length >= 5 && /^[a-zA-Z0-9]+$/.test(normalized) && /[a-zA-Z]/.test(normalized)
    );
  }

  defaultMessage(args: ValidationArguments): string {
    if (typeof args.value !== 'string' || args.value.trim().length < 5) {
      return 'Value error, Nome de usuário deve ter pelo menos 5 caracteres';
    }

    const normalized = args.value.trim();
    if (!/^[a-zA-Z0-9]+$/.test(normalized)) {
      return 'Value error, Nome de usuário pode conter apenas letras e números';
    }

    return 'Value error, Nome de usuário não pode ser composto apenas por números';
  }
}

@ValidatorConstraint({ name: 'cadistaPassword', async: false })
class CadistaPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && value.length >= 6 && /\d/.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    if (typeof args.value !== 'string' || args.value.length < 6) {
      return 'Value error, Senha deve ter pelo menos 6 caracteres';
    }

    return 'Value error, Senha deve conter ao menos um número';
  }
}

export class AuthRegisterRequestDto {
  @IsString()
  @Matches(EMAIL_PATTERN)
  email!: string;

  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Validate(CadistaUsernameConstraint)
  username!: string;

  @IsString()
  @Validate(CadistaPasswordConstraint)
  password!: string;
}
