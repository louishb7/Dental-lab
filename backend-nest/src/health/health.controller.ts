import { Controller, Get } from '@nestjs/common';

import { HealthService } from './health.service';
import type { AppHealthResponse, DatabaseHealthResponse } from './health.types';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  getAppHealth(): AppHealthResponse {
    return this.healthService.getAppHealth();
  }

  @Get('health/database')
  async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    return this.healthService.getDatabaseHealth();
  }
}
