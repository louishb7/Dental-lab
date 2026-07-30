import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  imports: [AuthModule, PrismaModule],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
