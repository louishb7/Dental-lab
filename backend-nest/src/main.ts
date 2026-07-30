import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import type { EnvironmentVariables } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvironmentVariables>);
  const port = config.get<number>('PORT');

  if (typeof port !== 'number') {
    throw new Error('PORT must be available after environment validation.');
  }

  await app.listen(port);
}

void bootstrap();
