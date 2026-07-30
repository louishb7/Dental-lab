import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';

@Module({
  controllers: [DoctorController],
  exports: [DoctorService],
  imports: [AuthModule, PrismaModule],
  providers: [DoctorService],
})
export class DoctorModule {}
