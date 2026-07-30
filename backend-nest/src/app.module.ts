import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { CaseItemModule } from './case-item/case-item.module';
import { CaseModule } from './case/case.module';
import { validateEnvironment } from './config/app.config';
import { DoctorModule } from './doctor/doctor.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    DoctorModule,
    CaseModule,
    CaseItemModule,
    HealthModule,
  ],
})
export class AppModule {}
