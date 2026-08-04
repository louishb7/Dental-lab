import {
  type ValidationArguments,
  type ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

import { assertValidQuantity } from '../case-item-rules';

@ValidatorConstraint({ name: 'cadiskCaseItemQuantity', async: false })
export class CaseItemQuantityConstraint implements ValidatorConstraintInterface {
  validate(value: number | null | undefined): boolean {
    try {
      assertValidQuantity(value);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    try {
      assertValidQuantity(args.value as number | null | undefined);
    } catch (error) {
      if (error instanceof Error) {
        return `Value error, ${error.message}`;
      }
    }

    return 'Value error, Quantidade deve ser maior ou igual a 1';
  }
}
