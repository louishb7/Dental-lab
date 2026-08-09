import { Injectable } from '@nestjs/common';
import { Prisma, type CaseItem, type DentalCase } from '@prisma/client';

import { normalizeDecimalValue } from '../case/case-money';
import { PrismaService } from '../prisma/prisma.service';
import { CaseItemCaseNotFoundError } from './case-item.errors';
import { assertValidQuantity, normalizeTooth } from './case-item-rules';
import type { CaseItemResponse } from './case-item.types';
import type { CaseItemCreateRequestDto } from './dto/case-item-create-request.dto';
import type { CaseItemUpdateRequestDto } from './dto/case-item-update-request.dto';

type ActiveCase = Pick<DentalCase, 'id' | 'pricingMode' | 'status'>;

@Injectable()
export class CaseItemService {
  constructor(private readonly prisma: PrismaService) {}

  async listCaseItems(caseId: number, userId: number): Promise<CaseItemResponse[]> {
    await this.assertActiveCase(caseId, userId);

    const items = await this.prisma.caseItem.findMany({
      where: {
        caseId,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return items.map((item) => this.toResponse(item));
  }

  async createCaseItem(
    caseId: number,
    input: CaseItemCreateRequestDto,
    userId: number,
  ): Promise<CaseItemResponse> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM cases WHERE id = ${caseId} FOR UPDATE`;
      
      const currentCase = await this.assertActiveCaseTx(tx, caseId, userId);
      if (currentCase.status === 'delivered') {
        throw new Error('Não é possível adicionar itens a um caso entregue.');
      }
      
      const unitValue = normalizeDecimalValue(input.unit_value, 'Valor unitário inválido');
      if (currentCase.pricingMode === 'services' && unitValue === null) {
        throw new Error('Informe o valor unitário do serviço para este caso.');
      }

      const data: Prisma.CaseItemUncheckedCreateInput = {
        caseId,
        tooth: normalizeTooth(input.tooth),
        serviceType: input.service_type,
        quantity: this.normalizeQuantity(input.quantity),
        unitValue,
        material: input.material ?? null,
        color: input.color ?? null,
        notes: input.notes ?? null,
      };

      const createdItem = await tx.caseItem.create({ data });
      if (currentCase.pricingMode === 'services') {
        await this.recalculateServiceCaseTotal(tx, caseId);
      }
      return this.toResponse(createdItem);
    });
  }

  async createCaseItemsBulk(
    caseId: number,
    inputs: CaseItemCreateRequestDto[],
    userId: number,
  ): Promise<CaseItemResponse[]> {
    if (!inputs || inputs.length === 0) {
      return [];
    }
    
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM cases WHERE id = ${caseId} FOR UPDATE`;
      
      const currentCase = await this.assertActiveCaseTx(tx, caseId, userId);
      if (currentCase.status === 'delivered') {
        throw new Error('Não é possível adicionar itens a um caso entregue.');
      }
      
      const data = inputs.map(input => {
        const unitValue = normalizeDecimalValue(input.unit_value, 'Valor unitário inválido');
        if (currentCase.pricingMode === 'services' && unitValue === null) {
          throw new Error('Informe o valor unitário do serviço para este caso.');
        }
        return {
          caseId,
          tooth: normalizeTooth(input.tooth),
          serviceType: input.service_type,
          quantity: this.normalizeQuantity(input.quantity),
          unitValue,
          material: input.material ?? null,
          color: input.color ?? null,
          notes: input.notes ?? null,
        };
      });

      const createdItems = await Promise.all(
        data.map(itemData => tx.caseItem.create({ data: itemData }))
      );

      if (currentCase.pricingMode === 'services') {
        await this.recalculateServiceCaseTotal(tx, caseId);
      }

      return createdItems.map(item => this.toResponse(item));
    });
  }

  async getCaseItemById(
    caseId: number,
    itemId: number,
    userId: number,
  ): Promise<CaseItemResponse | null> {
    const item = await this.prisma.caseItem.findFirst({
      where: this.itemOwnershipWhere(caseId, itemId, userId),
    });

    if (item === null) {
      return null;
    }

    return this.toResponse(item);
  }

  async updateCaseItem(
    caseId: number,
    itemId: number,
    input: CaseItemUpdateRequestDto,
    userId: number,
  ): Promise<CaseItemResponse | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM cases WHERE id = ${caseId} FOR UPDATE`;

      const currentCase = await this.assertActiveCaseTx(tx, caseId, userId);
      if (currentCase.status === 'delivered') {
        throw new Error('Não é possível modificar itens de um caso entregue.');
      }
      
      const currentItem = await tx.caseItem.findFirst({
        where: this.itemOwnershipWhere(caseId, itemId, userId),
      });

      if (currentItem === null) {
        return null;
      }

      const data = this.buildUpdateData(input, currentCase);

      const updatedItem = await tx.caseItem.update({
        where: { id: currentItem.id },
        data,
      });

      if (currentCase.pricingMode === 'services') {
        await this.recalculateServiceCaseTotal(tx, caseId);
      }

      return this.toResponse(updatedItem);
    });
  }

  async deleteCaseItem(caseId: number, itemId: number, userId: number): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM cases WHERE id = ${caseId} FOR UPDATE`;

      const currentCase = await this.assertActiveCaseTx(tx, caseId, userId);
      if (currentCase.status === 'delivered') {
        throw new Error('Não é possível excluir itens de um caso entregue.');
      }
      
      const currentItem = await tx.caseItem.findFirst({
        where: this.itemOwnershipWhere(caseId, itemId, userId),
      });

      if (currentItem === null) {
        return false;
      }

      await tx.caseItem.delete({
        where: { id: currentItem.id },
      });

      if (currentCase.pricingMode === 'services') {
        await this.recalculateServiceCaseTotal(tx, caseId);
      }

      return true;
    });
  }

  private async assertActiveCaseTx(tx: Prisma.TransactionClient, caseId: number, userId: number): Promise<ActiveCase> {
    const currentCase = await tx.dentalCase.findFirst({
      where: {
        id: caseId,
        deletedAt: null,
        doctor: {
          userId,
        },
      },
      select: {
        id: true,
        pricingMode: true,
        status: true,
      },
    });

    if (currentCase === null) {
      throw new CaseItemCaseNotFoundError();
    }

    return currentCase;
  }

  private async assertActiveCase(caseId: number, userId: number): Promise<ActiveCase> {
    const currentCase = await this.prisma.dentalCase.findFirst({
      where: {
        id: caseId,
        deletedAt: null,
        doctor: {
          userId,
        },
      },
      select: {
        id: true,
        pricingMode: true,
        status: true,
      },
    });

    if (currentCase === null) {
      throw new CaseItemCaseNotFoundError();
    }

    return currentCase;
  }

  private itemOwnershipWhere(
    caseId: number,
    itemId: number,
    userId: number,
  ): Prisma.CaseItemWhereInput {
    return {
      id: itemId,
      caseId,
      case: {
        deletedAt: null,
        doctor: {
          userId,
        },
      },
    };
  }

  private buildUpdateData(
    input: CaseItemUpdateRequestDto,
    currentCase: ActiveCase,
  ): Prisma.CaseItemUpdateInput {
    const data: Prisma.CaseItemUpdateInput = {};

    if (input.tooth !== undefined && input.tooth !== null) {
      data.tooth = normalizeTooth(input.tooth);
    }

    if (input.service_type !== undefined && input.service_type !== null) {
      data.serviceType = input.service_type;
    }

    if (input.quantity !== undefined && input.quantity !== null) {
      data.quantity = this.normalizeQuantity(input.quantity);
    }

    if (Object.prototype.hasOwnProperty.call(input, 'unit_value')) {
      const unitValue = normalizeDecimalValue(input.unit_value, 'Valor unitário inválido');
      if (currentCase.pricingMode === 'services' && unitValue === null) {
        throw new Error('Informe o valor unitário do serviço para este caso.');
      }
      data.unitValue = unitValue;
    }

    if (input.material !== undefined) {
      data.material = input.material;
    }

    if (input.color !== undefined) {
      data.color = input.color;
    }

    if (input.notes !== undefined) {
      data.notes = input.notes;
    }

    return data;
  }

  private normalizeQuantity(quantity: number | null | undefined): number {
    assertValidQuantity(quantity);
    return quantity ?? 1;
  }

  private async recalculateServiceCaseTotal(
    tx: Prisma.TransactionClient,
    caseId: number,
  ): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ total: Prisma.Decimal | null }>>`
      SELECT SUM(quantity * unit_value) AS total
      FROM case_items
      WHERE case_id = ${caseId}
    `;

    await tx.dentalCase.update({
      where: {
        id: caseId,
      },
      data: {
        totalValue: rows[0]?.total ?? null,
      },
    });
  }

  private toResponse(item: CaseItem): CaseItemResponse {
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
