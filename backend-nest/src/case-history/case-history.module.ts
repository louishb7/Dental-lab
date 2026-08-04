import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CaseHistoryController } from './case-history.controller';
import { CaseHistoryService } from './case-history.service';

@Module({
  controllers: [CaseHistoryController],
  exports: [CaseHistoryService],
  imports: [AuthModule, PrismaModule],
  providers: [CaseHistoryService],
})
export class CaseHistoryModule {}
