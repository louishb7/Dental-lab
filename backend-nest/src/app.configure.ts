import {
  type INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function flattenValidationErrors(errors: ValidationError[]): Array<{ msg: string; loc: string[] }> {
  const details: Array<{ msg: string; loc: string[] }> = [];

  const visit = (error: ValidationError, path: string[]): void => {
    const currentPath = [...path, error.property];
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({
          loc: currentPath,
          msg: error.value === undefined ? 'Field required' : message,
        });
      }
    }

    for (const child of error.children ?? []) {
      visit(child, currentPath);
    }
  };

  for (const error of errors) {
    visit(error, ['body']);
  }

  return details;
}

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          detail: flattenValidationErrors(errors),
        }),
      forbidUnknownValues: false,
      transform: true,
      whitelist: true,
    }),
  );
}
