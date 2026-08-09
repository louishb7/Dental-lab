import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CaseController } from './case.controller';
import { CaseService } from './case.service';
import { CaseRepository } from './case.repository';

@Module({
  controllers: [CaseController],
  exports: [CaseService],
  imports: [AuthModule, PrismaModule],
  providers: [CaseService, CaseRepository],
})
export class CaseModule {}
