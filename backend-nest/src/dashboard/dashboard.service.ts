import { Injectable } from '@nestjs/common';
import { Prisma, type DentalCase, type Doctor } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { getUtcDayStart, getUtcMonthWindow } from './dashboard-date';
import type { DashboardCaseResponse, DashboardSummaryResponse } from './dashboard.types';

type DashboardCaseWithDoctor = DentalCase & { doctor: Pick<Doctor, 'name'> | null };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(userId: number, now = new Date()): Promise<DashboardSummaryResponse> {
    const todayStart = getUtcDayStart(now);
    const { monthStart, nextMonth } = getUtcMonthWindow(now);

    const [statusRows, overdueCases, urgentOpenCases, deliveredCasesMonth, deliveredTotal] =
      await this.prisma.$transaction([
        this.prisma.$queryRaw<Array<{ status: string; count: number }>>`
          SELECT cases.status, COUNT(cases.id)::int AS count
          FROM cases
          JOIN doctors ON doctors.id = cases.doctor_id
          WHERE cases.deleted_at IS NULL
            AND doctors.user_id = ${userId}
          GROUP BY cases.status
        `,
        this.prisma.dentalCase.findMany({
          where: {
            ...this.activeOwnedCasesWhere(userId),
            status: {
              not: 'delivered',
            },
            deadline: {
              not: null,
              lt: todayStart,
            },
          },
          orderBy: [{ deadline: 'asc' }, { id: 'desc' }],
          include: {
            doctor: {
              select: {
                name: true,
              },
            },
          },
        }),
        this.prisma.dentalCase.findMany({
          where: {
            ...this.activeOwnedCasesWhere(userId),
            priority: 'urgent',
            status: {
              not: 'delivered',
            },
          },
          orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { id: 'desc' }],
          include: {
            doctor: {
              select: {
                name: true,
              },
            },
          },
        }),
        this.prisma.dentalCase.findMany({
          where: {
            ...this.activeOwnedCasesWhere(userId),
            status: 'delivered',
            deliveredAt: {
              gte: monthStart,
              lt: nextMonth,
              not: null,
            },
            totalValue: {
              not: null,
            },
          },
          orderBy: [{ deliveredAt: 'desc' }, { id: 'desc' }],
          include: {
            doctor: {
              select: {
                name: true,
              },
            },
          },
        }),
        this.prisma.dentalCase.aggregate({
          where: {
            ...this.activeOwnedCasesWhere(userId),
            status: 'delivered',
            deliveredAt: {
              gte: monthStart,
              lt: nextMonth,
              not: null,
            },
            totalValue: {
              not: null,
            },
          },
          _sum: {
            totalValue: true,
          },
        }),
      ]);

    const statusCounts: Record<string, number> = {
      pending: 0,
      completed: 0,
      delivered: 0,
    };
    for (const row of statusRows) {
      statusCounts[row.status] = row.count;
    }

    return {
      generated_at: now,
      status_counts: statusCounts,
      overdue_cases: overdueCases.map((foundCase) => this.toCaseResponse(foundCase)),
      urgent_open_cases: urgentOpenCases.map((foundCase) => this.toCaseResponse(foundCase)),
      delivered_cases_month: deliveredCasesMonth.map((foundCase) => this.toCaseResponse(foundCase)),
      delivered_total_month: deliveredTotal._sum.totalValue ?? new Prisma.Decimal(0),
      delivered_count_month: deliveredCasesMonth.length,
    };
  }

  private activeOwnedCasesWhere(userId: number): Prisma.DentalCaseWhereInput {
    return {
      deletedAt: null,
      doctor: {
        userId,
      },
    };
  }

  private toCaseResponse(foundCase: DashboardCaseWithDoctor): DashboardCaseResponse {
    return {
      id: foundCase.id,
      doctor_id: foundCase.doctorId,
      doctor_name: foundCase.doctor?.name ?? `#${foundCase.doctorId}`,
      patient_ref: foundCase.patientRef,
      deadline: foundCase.deadline,
      priority: foundCase.priority,
      status: foundCase.status,
      total_value: foundCase.totalValue,
      created_at: foundCase.createdAt,
      delivered_at: foundCase.deliveredAt,
    };
  }
}
