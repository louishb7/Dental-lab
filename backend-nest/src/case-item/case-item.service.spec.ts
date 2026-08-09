import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CaseItemService } from './case-item.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  dentalCase: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  caseItem: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
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
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCaseItem', () => {
    it('should create item and not use transaction if case pricingMode is fixed', async () => {
      prisma.dentalCase.findFirst.mockResolvedValue({ id: 1, pricingMode: 'fixed' });
      prisma.caseItem.create.mockResolvedValue({ id: 1, caseId: 1 });

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
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('should create item and use transaction to recalculate total if case pricingMode is services', async () => {
      prisma.dentalCase.findFirst.mockResolvedValue({ id: 1, pricingMode: 'services' });
      prisma.caseItem.create.mockResolvedValue({ id: 1, caseId: 1 });
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
      prisma.dentalCase.findFirst.mockResolvedValue({ id: 1, pricingMode: 'fixed' });
      prisma.caseItem.findFirst.mockResolvedValue({ id: 1, caseId: 1 });
      
      const result = await service.deleteCaseItem(1, 1, 1);
      
      expect(result).toBe(true);
      expect(prisma.caseItem.delete).toHaveBeenCalled();
    });
  });
  
  describe('updateCaseItem', () => {
    it('should update item successfully', async () => {
      prisma.dentalCase.findFirst.mockResolvedValue({ id: 1, pricingMode: 'fixed' });
      prisma.caseItem.findFirst.mockResolvedValue({ id: 1, caseId: 1 });
      prisma.caseItem.update.mockResolvedValue({ id: 1, caseId: 1, tooth: '12' });

      const result = await service.updateCaseItem(1, 1, { tooth: '12' }, 1);

      expect(result).toBeDefined();
      expect(result?.tooth).toBe('12');
      expect(prisma.caseItem.update).toHaveBeenCalled();
    });
  });
});
