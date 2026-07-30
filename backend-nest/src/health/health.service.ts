import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { AppHealthResponse, DatabaseHealthResponse } from './health.types';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getAppHealth(): AppHealthResponse {
    return {
      status: 'ok',
      service: 'cadista-nest',
    };
  }

  async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    const databaseAvailable = await this.prisma.checkConnection();

    if (!databaseAvailable) {
      throw new ServiceUnavailableException({
        detail: 'Banco de dados indisponivel',
      });
    }

    return {
      status: 'ok',
      database: 'ok',
    };
  }
}
