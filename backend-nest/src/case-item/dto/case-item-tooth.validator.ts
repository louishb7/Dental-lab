import {
  type ValidationArguments,
  type ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

import { isValidTooth, normalizeTooth } from '../case-item-rules';

@ValidatorConstraint({ name: 'cadistaCaseItemTooth', async: false })
export class CaseItemToothConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidTooth(value);
  }

  defaultMessage(args: ValidationArguments): string {
    try {
      normalizeTooth(args.value);
    } catch (error) {
      if (error instanceof Error) {
        return `Value error, ${error.message}`;
      }
    }

    return 'Value error, O campo tooth não pode ser vazio';
  }
}
