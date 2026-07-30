import { type ValidatorConstraintInterface, ValidatorConstraint } from 'class-validator';

import { isValidDecimalValue } from '../case-money';

@ValidatorConstraint({ name: 'cadistaDecimalValue', async: false })
export class CadistaDecimalValueConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidDecimalValue(value);
  }

  defaultMessage(): string {
    return 'Value error, Valor combinado inválido';
  }
}
