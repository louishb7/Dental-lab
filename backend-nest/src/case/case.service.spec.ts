import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CaseService } from './case.service';
import { CaseRepository, type CaseWithItems, type ICaseRepository } from './case.repository';
import type { Doctor } from '@prisma/client';

function caseFixture(overrides: Partial<CaseWithItems> = {}): CaseWithItems {
  return {
    id: 1,
    userId: 1,
    doctorId: 1,
    patientRef: 'Patient 1',
    pricingMode: 'fixed',
    deadline: null,
    priority: 'normal',
    status: 'pending',
    totalValue: new Prisma.Decimal('100'),
    deliveredTotalValue: null,
    notes: null,
    createdAt: new Date(),
    deliveredAt: null,
    deletedAt: null,
    statusRevertReason: null,
    items: [],
    ...overrides,
  };
}

const doctorFixture: Doctor = {
  id: 1,
  userId: 1,
  name: 'Doctor',
  clinicName: null,
  phone: null,
  notes: null,
  createdAt: new Date(),
  deletedAt: null,
};

const mockCaseRepository: jest.Mocked<Omit<ICaseRepository, 'runTransaction'>> &
  Pick<ICaseRepository, 'runTransaction'> = {
  async runTransaction<T>(cb: (repo: ICaseRepository) => Promise<T>): Promise<T> {
    return cb(mockCaseRepository);
  },
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
    repo = mockCaseRepository;
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCase', () => {
    it('should create a case successfully', async () => {
      repo.getDoctorById.mockResolvedValue(doctorFixture);
      const createdCase = caseFixture();
      repo.createCase.mockResolvedValue(createdCase);
      repo.createHistoryEvent.mockResolvedValue(undefined);

      const result = await service.createCase(
        {
          doctor_id: 1,
          patient_ref: 'Patient 1',
          pricing_mode: 'fixed',
          total_value: '100',
          priority: 'normal',
          status: 'pending',
        },
        1,
      );

      expect(repo.getDoctorById).toHaveBeenCalledWith(1, 1);
      expect(repo.createCase).toHaveBeenCalled();
      expect(repo.createHistoryEvent).toHaveBeenCalled();
      expect(result.id).toEqual(createdCase.id);
    });

    it('creates an avulso case for the authenticated user without looking up a doctor', async () => {
      repo.createCase.mockResolvedValue(caseFixture({ doctorId: null }));
      repo.createHistoryEvent.mockResolvedValue(undefined);

      const result = await service.createCase(
        { doctor_id: null, patient_ref: 'Avulso', priority: 'normal' },
        1,
      );
      expect(repo.getDoctorById).not.toHaveBeenCalled();
      expect(repo.createCase).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, doctorId: null }),
      );
      expect(result.doctor_id).toBeNull();
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
            status: 'pending',
          },
          1,
        ),
      ).rejects.toThrow('Doutor não encontrado');
    });
  });

  describe('getCaseById', () => {
    it('should return a case if found', async () => {
      const mockCase = caseFixture();
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
        caseFixture({ id: 1, status: 'completed' }),
        caseFixture({ id: 2, status: 'completed' }),
      ];

      repo.getCasesForBulkDeliver.mockResolvedValueOnce(mockCases); // for txCases
      repo.updateCase.mockResolvedValue(caseFixture({ status: 'delivered' }));
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
      const currentCase = caseFixture();
      repo.getCaseById.mockResolvedValue(currentCase);
      repo.updateCase.mockResolvedValue({ ...currentCase, status: 'completed' });

      const result = await service.updateCase(1, { status: 'completed' }, 1);
      expect(result?.status).toBe('completed');
      expect(repo.createHistoryEvent).toHaveBeenCalled();
    });
  });

  describe('revertCaseStatus', () => {
    it('should revert status and record history', async () => {
      const currentCase = caseFixture({ status: 'delivered', deliveredAt: new Date() });
      repo.getCaseById.mockResolvedValue(currentCase);
      repo.getDoctorById.mockResolvedValue({
        ...doctorFixture,
        id: currentCase.doctorId!,
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
