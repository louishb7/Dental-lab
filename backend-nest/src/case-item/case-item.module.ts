import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CaseItemController } from './case-item.controller';
import { CaseItemService } from './case-item.service';

@Module({
  controllers: [CaseItemController],
  imports: [AuthModule, PrismaModule],
  providers: [CaseItemService],
  exports: [CaseItemService],
})
export class CaseItemModule {}
