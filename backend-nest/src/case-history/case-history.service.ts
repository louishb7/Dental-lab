import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type CaseHistoryEvent,
  type CaseItem,
  type DentalCase,
  type Doctor,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { CaseItemResponse } from '../case/case.types';
import type { CaseHistoryEventsQueryDto } from './dto/case-history-events-query.dto';
import type { CaseHistoryListQueryDto } from './dto/case-history-list-query.dto';
import type {
  CaseHistoryDetailResponse,
  CaseHistoryDeleteResponse,
  CaseHistoryEventResponse,
  CaseHistoryEventsResponse,
  CaseHistoryListItem,
  CaseHistoryListResponse,
  PaginationMeta,
} from './case-history.types';

type HistoryCase = DentalCase & {
  doctor: Pick<Doctor, 'id' | 'name'> | null;
  items: CaseItem[];
  historyEvents: Pick<CaseHistoryEvent, 'id'>[];
};

@Injectable()
export class CaseHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listCases(
    query: CaseHistoryListQueryDto,
    userId: number,
  ): Promise<CaseHistoryListResponse> {
    const page = query.page;
    const limit = query.limit;
    const where = this.buildHistoryWhere(query, userId);
    const orderBy: Prisma.DentalCaseOrderByWithRelationInput[] = [
      { deliveredAt: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
      { id: 'desc' },
    ];

    const [total, cases] = await this.prisma.$transaction([
      this.prisma.dentalCase.count({ where }),
      this.prisma.dentalCase.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy,
        include: this.historyCaseInclude(),
      }),
    ]);

    return {
      items: cases.map((foundCase) => this.toListItem(foundCase)),
      pagination: this.toPagination(page, limit, total),
    };
  }

  async getCaseDetail(
    caseId: number,
    userId: number,
  ): Promise<CaseHistoryDetailResponse | null> {
    const foundCase = await this.prisma.dentalCase.findFirst({
      where: {
        id: caseId,
        doctor: {
          userId,
        },
      },
      include: this.historyCaseInclude(),
    });

    if (foundCase === null) {
      return null;
    }

    return {
      id: foundCase.id,
      doctor_id: foundCase.doctorId,
      doctor_name: foundCase.doctor?.name ?? `#${foundCase.doctorId}`,
      patient_ref: foundCase.patientRef,
      pricing_mode: foundCase.pricingMode,
      deadline: foundCase.deadline,
      priority: foundCase.priority,
      status: foundCase.status,
      total_value: foundCase.totalValue,
      delivered_total_value: foundCase.deliveredTotalValue,
      notes: foundCase.notes,
      created_at: foundCase.createdAt,
      delivered_at: foundCase.deliveredAt,
      deleted_at: foundCase.deletedAt,
      status_revert_reason: foundCase.statusRevertReason,
      items_count: foundCase.items.length,
      has_reverted: foundCase.historyEvents.length > 0,
      items: foundCase.items.map((item) => this.toItemResponse(item)),
    };
  }

  async listCaseEvents(
    caseId: number,
    query: CaseHistoryEventsQueryDto,
    userId: number,
  ): Promise<CaseHistoryEventsResponse | null> {
    const caseExists = await this.prisma.dentalCase.findFirst({
      where: {
        id: caseId,
        doctor: {
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (caseExists === null) {
      return null;
    }

    const page = query.page;
    const limit = query.limit;
    const where: Prisma.CaseHistoryEventWhereInput = {
      caseId,
      userId,
    };

    const [total, events] = await this.prisma.$transaction([
      this.prisma.caseHistoryEvent.count({ where }),
      this.prisma.caseHistoryEvent.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return {
      items: events.map((event) => this.toEventResponse(event)),
      pagination: this.toPagination(page, limit, total),
    };
  }

  async permanentlyDeleteCase(
    caseId: number,
    userId: number,
  ): Promise<CaseHistoryDeleteResponse | null> {
    const foundCase = await this.prisma.dentalCase.findFirst({
      where: {
        id: caseId,
        doctor: {
          userId,
        },
        deletedAt: {
          not: null,
        },
      },
      select: {
        id: true,
      },
    });

    if (foundCase === null) {
      return null;
    }

    await this.prisma.$transaction([
      this.prisma.caseHistoryEvent.deleteMany({ where: { caseId: foundCase.id } }),
      this.prisma.dentalCase.delete({ where: { id: foundCase.id } }),
    ]);

    return { deleted_count: 1 };
  }

  async permanentlyDeleteCases(
    caseIds: number[],
    userId: number,
  ): Promise<CaseHistoryDeleteResponse> {
    const normalizedIds = [...new Set(caseIds)];
    if (normalizedIds.length === 0) {
      return { deleted_count: 0 };
    }

    const deletedCases = await this.prisma.$transaction(async (tx) => {
      const ownedCases = await tx.dentalCase.findMany({
        where: {
          id: {
            in: normalizedIds,
          },
          doctor: {
            userId,
          },
          deletedAt: {
            not: null,
          },
        },
        select: {
          id: true,
        },
      });
      const ownedIds = ownedCases.map((foundCase) => foundCase.id);

      if (ownedIds.length === 0) {
        return { count: 0 };
      }

      await tx.caseHistoryEvent.deleteMany({
        where: {
          caseId: {
            in: ownedIds,
          },
        },
      });

      return tx.dentalCase.deleteMany({
        where: {
          id: {
            in: ownedIds,
          },
        },
      });
    });

    return { deleted_count: deletedCases.count };
  }

  private buildHistoryWhere(
    query: CaseHistoryListQueryDto,
    userId: number,
  ): Prisma.DentalCaseWhereInput {
    const search = query.q?.trim();
    const deliveredAt: Prisma.DateTimeNullableFilter = {};

    if (query.delivered_from !== undefined) {
      deliveredAt.gte = query.delivered_from;
    }
    if (query.delivered_to !== undefined) {
      deliveredAt.lt = query.delivered_to;
    }

    return {
      doctor: {
        userId,
      },
      ...(search
        ? {
            OR: [
              { patientRef: { contains: search, mode: 'insensitive' } },
              { doctor: { name: { contains: search, mode: 'insensitive' } } },
              ...(Number.isInteger(Number(search)) ? [{ id: Number(search) }] : []),
            ],
          }
        : {}),
      ...(query.doctor_id !== undefined ? { doctorId: query.doctor_id } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(Object.keys(deliveredAt).length > 0 ? { deliveredAt } : {}),
      ...(query.has_reverted === 'true'
        ? { historyEvents: { some: { eventType: 'status_reverted', userId } } }
        : {}),
      ...(query.has_reverted === 'false'
        ? { historyEvents: { none: { eventType: 'status_reverted', userId } } }
        : {}),
    };
  }

  private historyCaseInclude() {
    return {
      doctor: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        orderBy: {
          id: 'desc',
        },
      },
      historyEvents: {
        where: {
          eventType: 'status_reverted',
        },
        take: 1,
        select: {
          id: true,
        },
      },
    } satisfies Prisma.DentalCaseInclude;
  }

  private toListItem(foundCase: HistoryCase): CaseHistoryListItem {
    return {
      id: foundCase.id,
      doctor_id: foundCase.doctorId,
      doctor_name: foundCase.doctor?.name ?? `#${foundCase.doctorId}`,
      patient_ref: foundCase.patientRef,
      pricing_mode: foundCase.pricingMode,
      status: foundCase.status,
      total_value: foundCase.totalValue,
      delivered_total_value: foundCase.deliveredTotalValue,
      created_at: foundCase.createdAt,
      delivered_at: foundCase.deliveredAt,
      deleted_at: foundCase.deletedAt,
      items_count: foundCase.items.length,
      items_summary: this.summarizeItems(foundCase.items),
      has_reverted: foundCase.historyEvents.length > 0,
    };
  }

  private summarizeItems(items: CaseItem[]): string {
    if (items.length === 0) {
      return 'Sem itens de serviço';
    }

    const visibleItems = items.slice(0, 3).map((item) => {
      const quantity = item.quantity > 1 ? `${item.quantity}x ` : '';
      const tooth = item.tooth ? `Dente ${item.tooth}` : 'Sem dente';
      return `${quantity}${tooth}`;
    });
    const extra = items.length > visibleItems.length ? ` +${items.length - visibleItems.length}` : '';

    return `${visibleItems.join(', ')}${extra}`;
  }

  private toPagination(page: number, limit: number, total: number): PaginationMeta {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next_page: page < totalPages,
    };
  }

  private toEventResponse(event: CaseHistoryEvent): CaseHistoryEventResponse {
    return {
      id: event.id,
      case_id: event.caseId,
      event_type: event.eventType,
      from_status: event.fromStatus,
      to_status: event.toStatus,
      reason: event.reason,
      created_at: event.createdAt,
    };
  }

  private toItemResponse(item: CaseItem): CaseItemResponse {
    return {
      id: item.id,
      case_id: item.caseId,
      tooth: item.tooth,
      service_type: item.serviceType,
      quantity: item.quantity,
      unit_value: item.unitValue,
      material: item.material,
      color: item.color,
      notes: item.notes,
    };
  }
}
