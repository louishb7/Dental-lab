import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Prisma, type CaseItem, type DentalCase } from '@prisma/client';
import { CaseItemService } from './case-item.service';
import { PrismaService } from '../prisma/prisma.service';

const itemFixture: CaseItem = {
  id: 1,
  caseId: 1,
  tooth: '11',
  serviceType: 'coroa',
  quantity: 1,
  unitValue: new Prisma.Decimal('100'),
  material: null,
  color: null,
  notes: null,
};

const transaction = {
  dentalCase: {
    findFirst: jest.fn<
      Promise<Pick<DentalCase, 'id' | 'pricingMode' | 'status'> | null>,
      [Prisma.DentalCaseFindFirstArgs]
    >(),
    update: jest.fn<Promise<DentalCase>, [Prisma.DentalCaseUpdateArgs]>(),
  },
  caseItem: {
    create: jest.fn<Promise<CaseItem>, [Prisma.CaseItemCreateArgs]>(),
    findFirst: jest.fn<Promise<CaseItem | null>, [Prisma.CaseItemFindFirstArgs]>(),
    findMany: jest.fn<Promise<CaseItem[]>, [Prisma.CaseItemFindManyArgs]>(),
    update: jest.fn<Promise<CaseItem>, [Prisma.CaseItemUpdateArgs]>(),
    delete: jest.fn<Promise<CaseItem>, [Prisma.CaseItemDeleteArgs]>(),
  },
  $executeRaw: jest.fn<Promise<number>, [TemplateStringsArray, ...unknown[]]>(),
  $queryRaw: jest.fn<
    Promise<Array<{ total: Prisma.Decimal | null }>>,
    [TemplateStringsArray, ...unknown[]]
  >(),
};
const mockPrismaService = {
  ...transaction,
  $transaction: jest.fn(
    async (cb: (tx: typeof transaction) => Promise<unknown>): Promise<unknown> => cb(transaction),
  ),
};

describe('CaseItemService', () => {
  let service: CaseItemService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseItemService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CaseItemService>(CaseItemService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCaseItem', () => {
    it('should create item and use transaction even if case pricingMode is fixed', async () => {
      prisma.dentalCase.findFirst.mockResolvedValue({
        id: 1,
        pricingMode: 'fixed',
        status: 'pending',
      });
      prisma.caseItem.create.mockResolvedValue(itemFixture);

      const result = await service.createCaseItem(
        1,
        {
          tooth: '11',
          service_type: 'coroa',
          quantity: 1,
          unit_value: '100',
        },
        1,
      );

      expect(prisma.dentalCase.findFirst).toHaveBeenCalled();
      expect(prisma.caseItem.create).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('should create item and use transaction to recalculate total if case pricingMode is services', async () => {
      prisma.dentalCase.findFirst.mockResolvedValue({
        id: 1,
        pricingMode: 'services',
        status: 'pending',
      });
      prisma.caseItem.create.mockResolvedValue(itemFixture);
      prisma.$queryRaw.mockResolvedValue([{ total: new Prisma.Decimal('100.00') }]);

      const result = await service.createCaseItem(
        1,
        {
          tooth: '11',
          service_type: 'coroa',
          quantity: 1,
          unit_value: '100',
        },
        1,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.caseItem.create).toHaveBeenCalled();
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.dentalCase.update).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });
  });

  describe('deleteCaseItem', () => {
    it('should delete item successfully', async () => {
      prisma.dentalCase.findFirst.mockResolvedValue({
        id: 1,
        pricingMode: 'fixed',
        status: 'pending',
      });
      prisma.caseItem.findFirst.mockResolvedValue(itemFixture);

      const result = await service.deleteCaseItem(1, 1, 1);

      expect(result).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.caseItem.delete).toHaveBeenCalled();
    });
  });

  describe('updateCaseItem', () => {
    it('should update item successfully', async () => {
      prisma.dentalCase.findFirst.mockResolvedValue({
        id: 1,
        pricingMode: 'fixed',
        status: 'pending',
      });
      prisma.caseItem.findFirst.mockResolvedValue(itemFixture);
      prisma.caseItem.update.mockResolvedValue({ ...itemFixture, tooth: '12' });

      const result = await service.updateCaseItem(1, 1, { tooth: '12' }, 1);

      expect(result).toBeDefined();
      expect(result?.tooth).toBe('12');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.caseItem.update).toHaveBeenCalled();
    });
  });
});
