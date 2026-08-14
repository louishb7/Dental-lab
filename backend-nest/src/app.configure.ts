import {
  type INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ValidationError } from 'class-validator';
import type { NextFunction, Request, Response } from 'express';

import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { TRUST_PROXY_HOPS } from './config/app.constants';
import type { EnvironmentVariables } from './config/app.config';

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
  const config = app.get(ConfigService<EnvironmentVariables>);
  const nodeEnvironment = config.get<EnvironmentVariables['NODE_ENV']>('NODE_ENV') ?? 'development';
  const corsOrigins = config.get<string[]>('CORS_ORIGINS') ?? [];

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.getInstance().set('trust proxy', TRUST_PROXY_HOPS);

  app.use(createSecurityHeadersMiddleware());
  app.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin'],
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 200,
    origin: createCorsOriginValidator(corsOrigins, nodeEnvironment),
  });

  app.useGlobalFilters(new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          detail: flattenValidationErrors(errors),
        }),
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
    }),
  );
}

function createSecurityHeadersMiddleware() {
  return (request: Request, response: Response, next: NextFunction): void => {
    setHeaderIfMissing(response, 'Cache-Control', 'no-store');
    setHeaderIfMissing(response, 'Pragma', 'no-cache');
    setHeaderIfMissing(response, 'Expires', '0');
    setHeaderIfMissing(response, 'X-Content-Type-Options', 'nosniff');
    setHeaderIfMissing(response, 'X-Frame-Options', 'DENY');
    setHeaderIfMissing(response, 'Referrer-Policy', 'no-referrer');
    setHeaderIfMissing(response, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    setHeaderIfMissing(response, 'Cross-Origin-Opener-Policy', 'same-origin');
    setHeaderIfMissing(response, 'Cross-Origin-Resource-Policy', 'same-site');

    if (request.path.startsWith('/auth/')) {
      response.setHeader('Cache-Control', 'no-store');
    }

    next();
  };
}

function setHeaderIfMissing(response: Response, header: string, value: string): void {
  if (response.getHeader(header) === undefined) {
    response.setHeader(header, value);
  }
}

function createCorsOriginValidator(
  allowedOrigins: string[],
  nodeEnvironment: EnvironmentVariables['NODE_ENV'],
): (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void {
  const allowedOriginSet = new Set(allowedOrigins);

  return (origin, callback): void => {
    if (origin === undefined) {
      callback(null, true);
      return;
    }

    callback(
      null,
      allowedOriginSet.has(origin) || isAllowedLocalDevelopmentOrigin(origin, nodeEnvironment),
    );
  };
}

function isAllowedLocalDevelopmentOrigin(
  origin: string,
  nodeEnvironment: EnvironmentVariables['NODE_ENV'],
): boolean {
  if (nodeEnvironment === 'production') {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  return (
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
    parsed.port.length > 0
  );
}
