import { UnprocessableEntityException } from '@nestjs/common';
import { ValidatorConstraint, type ValidatorConstraintInterface } from 'class-validator';

export function passwordPolicyError(value: unknown): string | null {
  if (typeof value !== 'string' || (value.match(/\p{L}/gu)?.length ?? 0) < 5) {
    return 'Senha deve conter 5 ou mais letras';
  }
  if (!/\p{Nd}/u.test(value)) return 'Senha deve conter ao menos um número';
  // bcrypt only considers the first 72 bytes; do not silently truncate Unicode passwords.
  if (Buffer.byteLength(value, 'utf8') > 72) return 'Senha deve ter no máximo 72 bytes';
  return null;
}

export function assertPasswordPolicy(password: string): void {
  const error = passwordPolicyError(password);
  if (error) throw new UnprocessableEntityException({ detail: error });
}

@ValidatorConstraint({ name: 'cadiskPassword', async: false })
export class CadiskPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return passwordPolicyError(value) === null;
  }

  defaultMessage(args?: { value: unknown }): string {
    return `Value error, ${passwordPolicyError(args?.value)}`;
  }
}
