import { Injectable } from '@nestjs/common';
import { Prisma, type CaseItem, type DentalCase } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { normalizeDecimalValue } from './case-money';
import {
  assertLinearStatusTransition,
  getPreviousCaseStatus,
  resolvePricingMode,
  type PricingMode,
} from './case-rules';
import type { CaseBulkDeliverRequestDto } from './dto/case-bulk-deliver-request.dto';
import type { CaseCreateRequestDto } from './dto/case-create-request.dto';
import type { CaseListQueryDto } from './dto/case-list-query.dto';
import type { CaseUpdateRequestDto } from './dto/case-update-request.dto';
import type { CaseItemResponse, CaseResponse } from './case.types';

type CaseWithItems = DentalCase & { items: CaseItem[] };
type CaseMutationClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class CaseService {
  constructor(private readonly prisma: PrismaService) {}

  async createCase(input: CaseCreateRequestDto, userId: number): Promise<CaseResponse> {
    await this.assertActiveDoctor(input.doctor_id, userId);

    const totalValue = normalizeDecimalValue(input.total_value, 'Valor combinado inválido');
    const pricingMode = resolvePricingMode(input.pricing_mode, totalValue);
    if (pricingMode === 'fixed' && totalValue === null) {
      throw new Error('Informe o valor fixo para este caso.');
    }
    if (pricingMode === 'services' && input.pricing_mode === 'services' && totalValue !== null) {
      throw new Error('Casos por serviços não usam valor combinado.');
    }

    const createdCase = await this.prisma.$transaction(async (tx) => {
      const foundCase = await tx.dentalCase.create({
        data: {
          doctorId: input.doctor_id,
          patientRef: input.patient_ref,
          pricingMode,
          deadline: input.deadline ?? null,
          priority: input.priority,
          status: 'pending',
          totalValue: pricingMode === 'fixed' ? totalValue : null,
          notes: input.notes ?? null,
        },
        include: {
          items: true,
        },
      });

      await this.createHistoryEvent(tx, {
        caseId: foundCase.id,
        userId,
        eventType: 'case_created',
        fromStatus: null,
        toStatus: 'pending',
        createdAt: foundCase.createdAt,
      });

      return foundCase;
    });

    return this.toResponse(createdCase, 0);
  }

  async getCaseById(caseId: number, userId: number): Promise<CaseResponse | null> {
    const foundCase = await this.prisma.dentalCase.findFirst({
      where: this.activeCaseOwnershipWhere(caseId, userId),
      include: {
        items: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    if (foundCase === null) {
      return null;
    }

    return this.toResponse(foundCase, foundCase.items.length);
  }

  async getAllCases(query: CaseListQueryDto, userId: number): Promise<CaseResponse[]> {
    const cases = await this.prisma.dentalCase.findMany({
      skip: query.skip,
      take: query.limit,
      where: {
        deletedAt: null,
        doctor: {
          userId,
        },
        ...(query.doctor_id !== undefined ? { doctorId: query.doctor_id } : {}),
        ...(query.status !== undefined ? { status: query.status } : {}),
      },
      orderBy: {
        id: 'desc',
      },
      include: {
        items: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    return cases.map((foundCase) => this.toResponse(foundCase, foundCase.items.length));
  }

  async updateCase(
    caseId: number,
    input: CaseUpdateRequestDto,
    userId: number,
  ): Promise<CaseResponse | null> {
    const currentCase = await this.prisma.dentalCase.findFirst({
      where: this.activeCaseOwnershipWhere(caseId, userId),
      include: {
        items: true,
      },
    });

    if (currentCase === null) {
      return null;
    }

    if (input.doctor_id !== undefined && input.doctor_id !== null) {
      await this.assertActiveDoctor(input.doctor_id, userId);
    }

    const totalValueProvided = input.total_value !== undefined;
    const newTotalValue = totalValueProvided
      ? normalizeDecimalValue(input.total_value, 'Valor combinado inválido')
      : null;
    const targetPricingMode = resolvePricingMode(
      undefined,
      totalValueProvided ? newTotalValue : null,
      currentCase.pricingMode,
    );
    const data = await this.buildUpdateData(currentCase, input, {
      newTotalValue,
      targetPricingMode,
      totalValueProvided,
    });

    const shouldRecordStatusAdvance =
      input.status !== undefined && input.status !== null && input.status !== currentCase.status;

    const updatedCase = await this.prisma.$transaction(async (tx) => {
      const foundCase = await tx.dentalCase.update({
        where: {
          id: currentCase.id,
        },
        data,
        include: {
          items: {
            orderBy: {
              id: 'desc',
            },
          },
        },
      });

      if (shouldRecordStatusAdvance) {
        await this.createHistoryEvent(tx, {
          caseId: foundCase.id,
          userId,
          eventType: 'status_advanced',
          fromStatus: currentCase.status,
          toStatus: foundCase.status,
          createdAt: new Date(),
        });
      }

      return foundCase;
    });

    return this.toResponse(updatedCase, updatedCase.items.length);
  }

  async deleteCase(caseId: number, userId: number): Promise<CaseResponse> {
    const currentCase = await this.prisma.dentalCase.findFirst({
      where: this.activeCaseOwnershipWhere(caseId, userId),
      include: {
        items: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    if (currentCase === null) {
      throw new Error('Caso não encontrado');
    }

    const deletedCase = await this.prisma.dentalCase.update({
      where: {
        id: currentCase.id,
      },
      data: {
        deletedAt: new Date(),
      },
      include: {
        items: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    return this.toResponse(deletedCase, deletedCase.items.length);
  }

  async bulkDeliverCases(
    input: CaseBulkDeliverRequestDto,
    userId: number,
  ): Promise<CaseResponse[]> {
    const normalizedIds = [...new Set(input.case_ids ?? [])];

    const cases = await this.prisma.dentalCase.findMany({
      where: {
        deletedAt: null,
        doctor: {
          userId,
        },
        ...(input.doctor_id !== undefined && input.doctor_id !== null
          ? { doctorId: input.doctor_id }
          : {}),
        ...(normalizedIds.length > 0 ? { id: { in: normalizedIds } } : { status: 'completed' }),
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        items: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    if (normalizedIds.length > 0) {
      const foundIds = new Set(cases.map((foundCase) => foundCase.id));
      const missingIds = normalizedIds.filter((requestedId) => !foundIds.has(requestedId));
      if (missingIds.length > 0) {
        throw new Error('Alguns pedidos selecionados não foram encontrados.');
      }
    }

    if (cases.length === 0) {
      return [];
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const foundCase of cases) {
        const updatedCase = await tx.dentalCase.update({
          where: {
            id: foundCase.id,
          },
          data: {
            status: 'delivered',
            deliveredAt: foundCase.deliveredAt ?? now,
          },
        });

        if (foundCase.status !== 'delivered') {
          await this.createHistoryEvent(tx, {
            caseId: foundCase.id,
            userId,
            eventType: 'status_advanced',
            fromStatus: foundCase.status,
            toStatus: updatedCase.status,
            createdAt: now,
          });
        }
      }
    });

    const deliveredCases = await this.prisma.dentalCase.findMany({
      where: {
        id: {
          in: cases.map((foundCase) => foundCase.id),
        },
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        items: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    return deliveredCases.map((foundCase) => this.toResponse(foundCase, foundCase.items.length));
  }

  async revertCaseStatus(
    caseId: number,
    reason: string,
    userId: number,
  ): Promise<CaseResponse | null> {
    const trimmedReason = reason.trim().replace(/\s+/g, ' ');
    if (!trimmedReason) {
      throw new Error('Informe o motivo do retorno de status.');
    }

    const currentCase = await this.prisma.dentalCase.findFirst({
      where: this.activeCaseOwnershipWhere(caseId, userId),
      include: {
        items: true,
      },
    });

    if (currentCase === null) {
      return null;
    }

    const previousStatus = getPreviousCaseStatus(currentCase.status);
    const now = new Date();

    const revertedCase = await this.prisma.$transaction(async (tx) => {
      const foundCase = await tx.dentalCase.update({
        where: {
          id: currentCase.id,
        },
        data: {
          status: previousStatus,
          deliveredAt: currentCase.status === 'delivered' ? null : currentCase.deliveredAt,
          statusRevertReason: trimmedReason,
        },
        include: {
          items: {
            orderBy: {
              id: 'desc',
            },
          },
        },
      });

      await this.createHistoryEvent(tx, {
        caseId: foundCase.id,
        userId,
        eventType: 'status_reverted',
        fromStatus: currentCase.status,
        toStatus: previousStatus,
        reason: trimmedReason,
        createdAt: now,
      });

      return foundCase;
    });

    return this.toResponse(revertedCase, revertedCase.items.length);
  }

  private async assertActiveDoctor(doctorId: number, userId: number): Promise<void> {
    const doctor = await this.prisma.doctor.findFirst({
      where: {
        id: doctorId,
        userId,
        deletedAt: null,
      },
    });

    if (doctor === null) {
      throw new Error('Doutor não encontrado');
    }
  }

  private activeCaseOwnershipWhere(caseId: number, userId: number): Prisma.DentalCaseWhereInput {
    return {
      id: caseId,
      deletedAt: null,
      doctor: {
        userId,
      },
    };
  }

  private async buildUpdateData(
    currentCase: CaseWithItems,
    input: CaseUpdateRequestDto,
    pricing: {
      totalValueProvided: boolean;
      newTotalValue: Prisma.Decimal | null;
      targetPricingMode: PricingMode;
    },
  ): Promise<Prisma.DentalCaseUpdateInput> {
    const data: Prisma.DentalCaseUpdateInput = {};

    if (input.doctor_id !== undefined && input.doctor_id !== null) {
      data.doctor = {
        connect: {
          id: input.doctor_id,
        },
      };
    }

    if (input.patient_ref !== undefined && input.patient_ref !== null) {
      data.patientRef = input.patient_ref;
    }

    if (input.deadline !== undefined) {
      data.deadline = input.deadline;
    }

    if (input.priority !== undefined && input.priority !== null) {
      data.priority = input.priority;
    }

    if (input.notes !== undefined) {
      data.notes = input.notes;
    }

    if (pricing.totalValueProvided && pricing.targetPricingMode === 'fixed') {
      if (pricing.newTotalValue === null) {
        throw new Error('Informe o valor fixo para este caso.');
      }
      data.totalValue = pricing.newTotalValue;
    }

    if (pricing.totalValueProvided && pricing.targetPricingMode === 'services') {
      if (pricing.newTotalValue !== null) {
        throw new Error('Casos por serviços não usam valor combinado.');
      }
      data.totalValue = await this.sumCaseItemValues(currentCase.id);
    }

    if (
      !pricing.totalValueProvided &&
      pricing.targetPricingMode === 'services' &&
      this.hasNonStatusCaseUpdate(input)
    ) {
      data.totalValue = await this.sumCaseItemValues(currentCase.id);
    }

    if (input.status !== undefined && input.status !== null) {
      assertLinearStatusTransition(currentCase.status, input.status);
      data.status = input.status;
      if (input.status === 'delivered' && currentCase.deliveredAt === null) {
        data.deliveredAt = new Date();
      }
    } else if (
      currentCase.status !== 'pending' &&
      currentCase.status !== 'completed' &&
      currentCase.status !== 'delivered'
    ) {
      throw new Error('Status atual inválido.');
    }

    return data;
  }

  private hasNonStatusCaseUpdate(input: CaseUpdateRequestDto): boolean {
    return (
      input.doctor_id !== undefined ||
      input.patient_ref !== undefined ||
      input.deadline !== undefined ||
      input.priority !== undefined ||
      input.notes !== undefined
    );
  }

  private async sumCaseItemValues(caseId: number): Promise<Prisma.Decimal | null> {
    const rows = await this.prisma.$queryRaw<Array<{ total: Prisma.Decimal | null }>>`
      SELECT SUM(quantity * unit_value) AS total
      FROM case_items
      WHERE case_id = ${caseId}
    `;

    return rows[0]?.total ?? null;
  }

  private async createHistoryEvent(
    client: CaseMutationClient,
    data: {
      caseId: number;
      userId: number;
      eventType: 'case_created' | 'status_advanced' | 'status_reverted';
      fromStatus: string | null;
      toStatus: string | null;
      reason?: string | null;
      createdAt?: Date;
    },
  ): Promise<void> {
    await client.caseHistoryEvent.create({
      data: {
        caseId: data.caseId,
        userId: data.userId,
        eventType: data.eventType,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        reason: data.reason ?? null,
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      },
    });
  }

  private toResponse(foundCase: CaseWithItems, itemsCount: number): CaseResponse {
    return {
      id: foundCase.id,
      doctor_id: foundCase.doctorId,
      patient_ref: foundCase.patientRef,
      pricing_mode: foundCase.pricingMode,
      deadline: foundCase.deadline,
      priority: foundCase.priority,
      status: foundCase.status,
      total_value: foundCase.totalValue,
      notes: foundCase.notes,
      created_at: foundCase.createdAt,
      delivered_at: foundCase.deliveredAt,
      deleted_at: foundCase.deletedAt,
      status_revert_reason: foundCase.statusRevertReason,
      items_count: itemsCount,
      items: foundCase.items.map((item) => this.toItemResponse(item)),
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
