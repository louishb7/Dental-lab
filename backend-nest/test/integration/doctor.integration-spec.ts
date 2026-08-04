import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { AuthModule } from '../../src/auth/auth.module';
import { validateEnvironment } from '../../src/config/app.config';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { DoctorModule } from '../../src/doctor/doctor.module';
import { DoctorService } from '../../src/doctor/doctor.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserModule } from '../../src/user/user.module';

describe('DoctorService integration', () => {
  let doctors: DoctorService;
  let prisma: PrismaService;

  async function resetDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE case_history_events, case_items, cases, doctors, users RESTART IDENTITY CASCADE',
    );
  }

  async function createUser(email: string, username: string): Promise<number> {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: 'not-used',
      },
    });
    return user.id;
  }

  beforeAll(async () => {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: validateEnvironment,
        }),
        PrismaModule,
        UserModule,
        AuthModule,
        DoctorModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    doctors = moduleRef.get(DoctorService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it('creates, updates and soft deletes a doctor with phone normalization', async () => {
    const userId = await createUser('admin@cadista.local', 'admin1');

    const created = await doctors.createDoctor(
      {
        clinic_name: 'Clínica Central',
        name: 'Dr. João',
        notes: 'Contato principal',
        phone: '11999990000',
      },
      userId,
    );

    expect(created.id).toBe(1);
    expect(created.phone).toBe('(11)99999-0000');
    expect(created.deleted_at).toBeNull();
    expect(created.cases_count).toBe(0);

    const updated = await doctors.updateDoctor(
      created.id,
      {
        notes: 'Atualizado',
        phone: '(11)98888-0000',
      },
      userId,
    );

    expect(updated?.phone).toBe('(11)98888-0000');
    expect(updated?.notes).toBe('Atualizado');

    await expect(doctors.deleteDoctor(created.id, userId)).resolves.toBe(true);
    await expect(doctors.getDoctorById(created.id, userId)).resolves.toBeNull();
    await expect(doctors.getAllDoctors(0, 100, userId)).resolves.toEqual([]);

    const deleted = await prisma.doctor.findUniqueOrThrow({ where: { id: created.id } });
    expect(deleted.deletedAt).toBeInstanceOf(Date);
  });

  it('scopes reads and writes by authenticated user ownership', async () => {
    const firstUserId = await createUser('first@cadista.local', 'first1');
    const secondUserId = await createUser('second@cadista.local', 'second1');
    const firstDoctor = await doctors.createDoctor({ name: 'Dr. Primeiro' }, firstUserId);
    const secondDoctor = await doctors.createDoctor({ name: 'Dr. Segundo' }, secondUserId);

    await expect(doctors.getDoctorById(firstDoctor.id, secondUserId)).resolves.toBeNull();
    await expect(
      doctors.updateDoctor(firstDoctor.id, { name: 'Tentativa' }, secondUserId),
    ).resolves.toBeNull();
    await expect(doctors.deleteDoctor(firstDoctor.id, secondUserId)).resolves.toBe(false);

    await expect(doctors.getAllDoctors(0, 100, firstUserId)).resolves.toMatchObject([
      { id: firstDoctor.id, name: 'Dr. Primeiro' },
    ]);
    await expect(doctors.getAllDoctors(0, 100, secondUserId)).resolves.toMatchObject([
      { id: secondDoctor.id, name: 'Dr. Segundo' },
    ]);
  });

  it('counts only active cases and blocks delete only for pending/completed active cases', async () => {
    const userId = await createUser('admin@cadista.local', 'admin1');
    const doctor = await doctors.createDoctor({ name: 'Dr. Casos' }, userId);

    await prisma.dentalCase.create({
      data: {
        doctorId: doctor.id,
        patientRef: 'Paciente ativo',
        status: 'pending',
      },
    });
    await prisma.dentalCase.create({
      data: {
        doctorId: doctor.id,
        deletedAt: new Date(),
        patientRef: 'Paciente removido',
        status: 'completed',
      },
    });

    await expect(doctors.getDoctorById(doctor.id, userId)).resolves.toMatchObject({
      cases_count: 1,
    });
    await expect(doctors.deleteDoctor(doctor.id, userId)).rejects.toThrow(
      'casos pendentes ou em andamento',
    );

    await prisma.dentalCase.updateMany({
      where: { doctorId: doctor.id },
      data: { status: 'delivered' },
    });

    await expect(doctors.deleteDoctor(doctor.id, userId)).resolves.toBe(true);
  });
});
