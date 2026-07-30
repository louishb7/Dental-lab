import { type ValidatorConstraintInterface, ValidatorConstraint } from 'class-validator';

import { isValidDecimalValue } from '../../case/case-money';

@ValidatorConstraint({ name: 'cadistaCaseItemDecimalValue', async: false })
export class CaseItemDecimalValueConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidDecimalValue(value);
  }

  defaultMessage(): string {
    return 'Value error, Valor unitário inválido';
  }
}
