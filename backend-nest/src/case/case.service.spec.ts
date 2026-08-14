import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CaseService } from './case.service';
import { CaseRepository } from './case.repository';

const mockCaseRepository = {
  runTransaction: jest.fn(async (cb) => cb(mockCaseRepository)),
  createCase: jest.fn(),
  getCaseById: jest.fn(),
  getAllCases: jest.fn(),
  updateCase: jest.fn(),
  deleteCase: jest.fn(),
  getCasesForBulkDeliver: jest.fn(),
  lockCaseRow: jest.fn(),
  getDoctorById: jest.fn(),
  sumCaseItemValues: jest.fn(),
  createHistoryEvent: jest.fn(),
};

describe('CaseService', () => {
  let service: CaseService;
  let repo: typeof mockCaseRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseService,
        {
          provide: CaseRepository,
          useValue: mockCaseRepository,
        },
      ],
    }).compile();

    service = module.get<CaseService>(CaseService);
    repo = module.get(CaseRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCase', () => {
    it('should create a case successfully', async () => {
      repo.getDoctorById.mockResolvedValue({ id: 1, userId: 1, deletedAt: null });
      const createdCase = {
        id: 1,
        doctorId: 1,
        patientRef: 'Patient 1',
        pricingMode: 'fixed',
        deadline: new Date(),
        priority: 'normal',
        status: 'pending',
        totalValue: new Prisma.Decimal('100.00'),
        notes: null,
        createdAt: new Date(),
        items: [],
      };
      repo.createCase.mockResolvedValue(createdCase);
      repo.createHistoryEvent.mockResolvedValue({});

      const result = await service.createCase(
        {
          doctor_id: 1,
          patient_ref: 'Patient 1',
          pricing_mode: 'fixed',
          total_value: '100',
          priority: 'normal',
        },
        1,
      );

      expect(repo.getDoctorById).toHaveBeenCalledWith(1, 1);
      expect(repo.createCase).toHaveBeenCalled();
      expect(repo.createHistoryEvent).toHaveBeenCalled();
      expect(result.id).toEqual(createdCase.id);
    });

    it('should throw if doctor not found', async () => {
      repo.getDoctorById.mockResolvedValue(null);

      await expect(
        service.createCase(
          {
            doctor_id: 99,
            patient_ref: 'Patient 1',
            pricing_mode: 'fixed',
            total_value: '100',
            priority: 'normal',
          },
          1,
        ),
      ).rejects.toThrow('Doutor não encontrado');
    });
  });

  describe('getCaseById', () => {
    it('should return a case if found', async () => {
      const mockCase = {
        id: 1,
        items: [],
      };
      repo.getCaseById.mockResolvedValue(mockCase);

      const result = await service.getCaseById(1, 1);
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('should return null if case not found', async () => {
      repo.getCaseById.mockResolvedValue(null);

      const result = await service.getCaseById(99, 1);
      expect(result).toBeNull();
    });
  });

  describe('bulkDeliverCases', () => {
    it('should deliver cases successfully', async () => {
      const mockCases = [
        { id: 1, status: 'completed', items: [] },
        { id: 2, status: 'completed', items: [] },
      ];

      repo.getCasesForBulkDeliver.mockResolvedValueOnce(mockCases); // for txCases
      repo.updateCase.mockResolvedValue({ id: 1, status: 'delivered' });
      repo.getCasesForBulkDeliver.mockResolvedValueOnce(
        mockCases.map((c) => ({ ...c, status: 'delivered' })),
      ); // for return

      const result = await service.bulkDeliverCases({ case_ids: [1, 2] }, 1);

      expect(repo.updateCase).toHaveBeenCalledTimes(2);
      expect(repo.createHistoryEvent).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(2);
    });
  });

  describe('updateCase', () => {
    it('should update case and record history if status changes', async () => {
      const currentCase = {
        id: 1,
        status: 'pending',
        pricingMode: 'fixed',
        items: [],
      };
      repo.getCaseById.mockResolvedValue(currentCase);
      repo.updateCase.mockResolvedValue({ ...currentCase, status: 'completed' });

      const result = await service.updateCase(1, { status: 'completed' }, 1);
      expect(result?.status).toBe('completed');
      expect(repo.createHistoryEvent).toHaveBeenCalled();
    });
  });

  describe('revertCaseStatus', () => {
    it('should revert status and record history', async () => {
      const currentCase = {
        id: 1,
        status: 'delivered',
        deliveredAt: new Date(),
        items: [],
      };
      repo.getCaseById.mockResolvedValue(currentCase);
      repo.getDoctorById.mockResolvedValue({
        id: currentCase.doctorId,
        userId: 1,
        deletedAt: null,
      });
      repo.updateCase.mockResolvedValue({ ...currentCase, status: 'completed' });

      const result = await service.revertCaseStatus(1, 'Reason here', 1);
      expect(result?.status).toBe('completed');
      expect(repo.createHistoryEvent).toHaveBeenCalled();
    });
  });
});
