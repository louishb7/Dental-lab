import { Controller, Get, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import type { DashboardSummaryResponse } from './dashboard.types';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('/overview')
  async readDashboardOverview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardSummaryResponse> {
    return this.dashboard.getDashboardSummary(user.id);
  }
}
