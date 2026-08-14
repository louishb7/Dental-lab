import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { configureApp } from './app.configure';
import { AppModule } from './app.module';
import { APP_TIME_ZONE } from './config/app.constants';
import type { EnvironmentVariables } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService<EnvironmentVariables>);
  const port = config.get<number>('PORT');
  process.env.TZ = APP_TIME_ZONE;

  if (typeof port !== 'number') {
    throw new Error('PORT must be available after environment validation.');
  }

  await app.listen(port);
}

void bootstrap();
