import { Injectable } from '@nestjs/common';
import { normalizeDecimalValue } from './case-money';
import {
  assertLinearStatusTransition,
  getPreviousCaseStatus,
  resolvePricingMode,
} from './case-rules';
import type { CaseBulkDeliverRequestDto } from './dto/case-bulk-deliver-request.dto';
import type { CaseCreateRequestDto } from './dto/case-create-request.dto';
import type { CaseListQueryDto } from './dto/case-list-query.dto';
import type { CaseUpdateRequestDto } from './dto/case-update-request.dto';
import type { CaseItemResponse, CaseResponse } from './case.types';
import { CaseRepository, type CaseWithItems, type ICaseRepository } from './case.repository';
import { createPricingStrategy, type PricingOptions } from './case-pricing.strategy';

@Injectable()
export class CaseService {
  constructor(private readonly caseRepository: CaseRepository) {}

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

    const createdCase = await this.caseRepository.runTransaction(async (repo) => {
      const foundCase = await repo.createCase({
        doctorId: input.doctor_id,
        patientRef: input.patient_ref,
        pricingMode,
        deadline: input.deadline ?? null,
        priority: input.priority,
        status: 'pending',
        totalValue: pricingMode === 'fixed' ? totalValue : null,
        notes: input.notes ?? null,
      });

      await repo.createHistoryEvent({
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
    const foundCase = await this.caseRepository.getCaseById(caseId, userId);
    if (foundCase === null) {
      return null;
    }

    return this.toResponse(foundCase, foundCase.items.length);
  }

  async getAllCases(query: CaseListQueryDto, userId: number): Promise<CaseResponse[]> {
    const cases = await this.caseRepository.getAllCases(
      query.skip,
      query.limit,
      userId,
      query.doctor_id,
      query.status
    );

    return cases.map((foundCase) => this.toResponse(foundCase, foundCase.items.length));
  }

  async updateCase(
    caseId: number,
    input: CaseUpdateRequestDto,
    userId: number,
  ): Promise<CaseResponse | null> {
    if (input.doctor_id !== undefined && input.doctor_id !== null) {
      await this.assertActiveDoctor(input.doctor_id, userId);
    }

    const updatedCase = await this.caseRepository.runTransaction(async (repo) => {
      const currentCase = await repo.getCaseById(caseId, userId);
      if (currentCase === null) {
        return null;
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
      
      const pricingOptions: PricingOptions = {
        newTotalValue,
        targetPricingMode,
        totalValueProvided,
      };

      const data = await this.buildUpdateData(currentCase, input, pricingOptions, repo);
      const shouldRecordStatusAdvance =
        input.status !== undefined && input.status !== null && input.status !== currentCase.status;

      const foundCase = await repo.updateCase(currentCase.id, data);

      if (shouldRecordStatusAdvance) {
        await repo.createHistoryEvent({
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

    if (updatedCase === null) {
      return null;
    }

    return this.toResponse(updatedCase, updatedCase.items.length);
  }

  async deleteCase(caseId: number, userId: number): Promise<CaseResponse> {
    const currentCase = await this.caseRepository.getCaseById(caseId, userId);
    if (currentCase === null) {
      throw new Error('Caso não encontrado');
    }

    const deletedCase = await this.caseRepository.deleteCase(currentCase.id);
    return this.toResponse(deletedCase, deletedCase.items.length);
  }

  async bulkDeliverCases(
    input: CaseBulkDeliverRequestDto,
    userId: number,
  ): Promise<CaseResponse[]> {
    const normalizedIds = [...new Set(input.case_ids ?? [])];

    const now = new Date();
    const cases = await this.caseRepository.runTransaction(async (repo) => {
      const txCases = await repo.getCasesForBulkDeliver(userId, input.doctor_id ?? undefined, normalizedIds);

      if (normalizedIds.length > 0) {
        const foundIds = new Set(txCases.map((foundCase) => foundCase.id));
        const missingIds = normalizedIds.filter((requestedId) => !foundIds.has(requestedId));
        if (missingIds.length > 0) {
          throw new Error('Alguns pedidos selecionados não foram encontrados.');
        }
      }

      if (txCases.length === 0) {
        return [];
      }

      for (const foundCase of txCases) {
        const updatedCase = await repo.updateCase(foundCase.id, {
          status: 'delivered',
          deliveredAt: foundCase.deliveredAt ?? now,
        });

        if (foundCase.status !== 'delivered') {
          await repo.createHistoryEvent({
            caseId: foundCase.id,
            userId,
            eventType: 'status_advanced',
            fromStatus: foundCase.status,
            toStatus: updatedCase.status,
            createdAt: now,
          });
        }
      }
      return txCases;
    });

    if (cases.length === 0) return [];

    const deliveredCases = await this.caseRepository.getCasesForBulkDeliver(
      userId, 
      undefined, 
      cases.map((foundCase) => foundCase.id)
    );

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

    const now = new Date();

    const revertedCase = await this.caseRepository.runTransaction(async (repo) => {
      const currentCase = await repo.getCaseById(caseId, userId);
      if (currentCase === null) {
        return null;
      }

      const previousStatus = getPreviousCaseStatus(currentCase.status);

      const foundCase = await repo.updateCase(currentCase.id, {
        status: previousStatus,
        deliveredAt: currentCase.status === 'delivered' ? null : currentCase.deliveredAt,
        statusRevertReason: trimmedReason,
      });

      await repo.createHistoryEvent({
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

    if (revertedCase === null) {
      return null;
    }

    return this.toResponse(revertedCase, revertedCase.items.length);
  }

  private async assertActiveDoctor(doctorId: number, userId: number): Promise<void> {
    const doctor = await this.caseRepository.getDoctorById(doctorId, userId);
    if (doctor === null) {
      throw new Error('Doutor não encontrado');
    }
  }

  private async buildUpdateData(
    currentCase: CaseWithItems,
    input: CaseUpdateRequestDto,
    pricing: PricingOptions,
    repo: ICaseRepository,
  ): Promise<any> {
    const data: any = {};

    if (input.doctor_id !== undefined && input.doctor_id !== null) {
      data.doctor = { connect: { id: input.doctor_id } };
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

    const strategy = createPricingStrategy(pricing);
    if (strategy) {
      data.totalValue = await strategy.calculateValue(currentCase, input, repo);
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
      items: foundCase.items.map((item: any) => this.toItemResponse(item)),
    };
  }

  private toItemResponse(item: any): CaseItemResponse {
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
