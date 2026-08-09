import { Injectable } from '@nestjs/common';
import { Prisma, type CaseItem, type DentalCase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipBase } from '../common/ownership.base';

export type CaseWithItems = DentalCase & { items: CaseItem[] };

export interface ICaseRepository {
  runTransaction<T>(fn: (repo: ICaseRepository) => Promise<T>): Promise<T>;
  createCase(data: any): Promise<CaseWithItems>;
  createHistoryEvent(data: any): Promise<void>;
  getCaseById(caseId: number, userId: number): Promise<CaseWithItems | null>;
  getAllCases(skip: number | undefined, limit: number | undefined, userId: number, doctorId?: number, status?: string): Promise<CaseWithItems[]>;
  updateCase(id: number, data: any): Promise<CaseWithItems>;
  deleteCase(id: number): Promise<CaseWithItems>;
  getCasesForBulkDeliver(userId: number, doctorId?: number, caseIds?: number[]): Promise<CaseWithItems[]>;
  sumCaseItemValues(caseId: number): Promise<Prisma.Decimal | null>;
  getDoctorById(doctorId: number, userId: number): Promise<any | null>;
}

@Injectable()
export class CaseRepository extends OwnershipBase implements ICaseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tx?: Prisma.TransactionClient,
  ) {
    super();
  }

  private get client(): Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  async runTransaction<T>(fn: (repo: ICaseRepository) => Promise<T>): Promise<T> {
    if (this.tx) {
      return fn(this);
    }
    return this.prisma.$transaction(async (prismaTx) => {
      const repo = new CaseRepository(this.prisma, prismaTx);
      return fn(repo);
    });
  }

  async createCase(data: any): Promise<CaseWithItems> {
    return this.client.dentalCase.create({
      data,
      include: { items: true },
    });
  }

  async createHistoryEvent(data: any): Promise<void> {
    await this.client.caseHistoryEvent.create({ data });
  }

  async getCaseById(caseId: number, userId: number): Promise<CaseWithItems | null> {
    return this.client.dentalCase.findFirst({
      where: this.ownCase(caseId, userId),
      include: {
        items: { orderBy: { id: 'desc' } },
      },
    });
  }

  async getAllCases(skip: number | undefined, limit: number | undefined, userId: number, doctorId?: number, status?: string): Promise<CaseWithItems[]> {
    return this.client.dentalCase.findMany({
      skip,
      take: limit,
      where: {
        ...this.ownCases(userId),
        ...(doctorId !== undefined ? { doctorId } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      orderBy: { id: 'desc' },
      include: {
        items: { orderBy: { id: 'desc' } },
      },
    });
  }

  async updateCase(id: number, data: any): Promise<CaseWithItems> {
    return this.client.dentalCase.update({
      where: { id },
      data,
      include: {
        items: { orderBy: { id: 'desc' } },
      },
    });
  }

  async deleteCase(id: number): Promise<CaseWithItems> {
    return this.client.dentalCase.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        items: { orderBy: { id: 'desc' } },
      },
    });
  }

  async getCasesForBulkDeliver(userId: number, doctorId?: number, caseIds?: number[]): Promise<CaseWithItems[]> {
    return this.client.dentalCase.findMany({
      where: {
        ...this.ownCases(userId),
        ...(doctorId !== undefined && doctorId !== null ? { doctorId } : {}),
        ...((caseIds && caseIds.length > 0) ? { id: { in: caseIds } } : { status: 'completed' }),
      },
      orderBy: { id: 'asc' },
      include: {
        items: { orderBy: { id: 'desc' } },
      },
    });
  }

  async sumCaseItemValues(caseId: number): Promise<Prisma.Decimal | null> {
    const rows = await this.client.$queryRaw<Array<{ total: Prisma.Decimal | null }>>`
      SELECT SUM(quantity * unit_value) AS total
      FROM case_items
      WHERE case_id = ${caseId}
    `;
    return rows[0]?.total ?? null;
  }

  async getDoctorById(doctorId: number, userId: number): Promise<any | null> {
    return this.client.doctor.findFirst({
      where: this.ownDoctor(doctorId, userId),
    });
  }
}
