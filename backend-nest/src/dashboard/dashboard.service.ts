import { Injectable } from '@nestjs/common';
import { Prisma, type DentalCase, type Doctor } from '@prisma/client';
import { addMonths, startOfMonth } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

import { APP_TIME_ZONE } from '../config/app.constants';
import { PrismaService } from '../prisma/prisma.service';
import { getAppDayStart, getAppMonthWindow } from './dashboard-date';
import type {
  DashboardCaseResponse,
  DashboardRevenueTrendItem,
  DashboardSummaryResponse,
} from './dashboard.types';

type DashboardCaseWithDoctor = DentalCase & {
  doctor: Pick<Doctor, 'name'> | null;
  _count?: {
    items: number;
  };
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(userId: number, now = new Date()): Promise<DashboardSummaryResponse> {
    const todayStart = getAppDayStart(now, APP_TIME_ZONE);
    const { monthStart, nextMonth } = getAppMonthWindow(now, APP_TIME_ZONE);

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
            doctor: { select: { name: true } },
            _count: { select: { items: true } },
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
            doctor: { select: { name: true } },
            _count: { select: { items: true } },
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
            deliveredTotalValue: {
              not: null,
            },
          },
          orderBy: [{ deliveredAt: 'desc' }, { id: 'desc' }],
          include: {
            doctor: { select: { name: true } },
            _count: { select: { items: true } },
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
            deliveredTotalValue: {
              not: null,
            },
          },
          _sum: {
            deliveredTotalValue: true,
          },
        }),
      ]);
    const revenueTrend = await this.getRevenueTrend(userId, now);

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
      delivered_total_month: deliveredTotal._sum.deliveredTotalValue ?? new Prisma.Decimal(0),
      delivered_count_month: deliveredCasesMonth.length,
      revenue_trend: revenueTrend,
    };
  }

  private async getRevenueTrend(userId: number, now: Date): Promise<DashboardRevenueTrendItem[]> {
    const windows = Array.from({ length: 6 }, (_, index) => {
      const monthOffset = index - 5;
      const zonedNow = toZonedTime(now, APP_TIME_ZONE);
      const zonedStart = addMonths(startOfMonth(zonedNow), monthOffset);
      const start = fromZonedTime(zonedStart, APP_TIME_ZONE);
      const end = fromZonedTime(addMonths(zonedStart, 1), APP_TIME_ZONE);
      return { start, end, zonedStart };
    });

    const rows = await this.prisma.$transaction(
      windows.map((window) =>
        this.prisma.dentalCase.aggregate({
          where: {
            ...this.activeOwnedCasesWhere(userId),
            status: 'delivered',
            deliveredAt: {
              gte: window.start,
              lt: window.end,
              not: null,
            },
            deliveredTotalValue: {
              not: null,
            },
          },
          _count: {
            id: true,
          },
          _sum: {
            deliveredTotalValue: true,
          },
        }),
      ),
    );

    return windows.map((window, index) => {
      const year = window.zonedStart.getFullYear();
      const month = String(window.zonedStart.getMonth() + 1).padStart(2, '0');
      return {
        month: `${year}-${month}`,
        total_value: rows[index]?._sum.deliveredTotalValue ?? new Prisma.Decimal(0),
        delivered_count: rows[index]?._count.id ?? 0,
      };
    });
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
      items_count: foundCase._count?.items ?? 0,
    };
  }
}
