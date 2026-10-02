import { PersistentSessionService } from './persistent-session.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthService } from './auth.service';

type SessionRow = {
  id: number;
  userId: number;
  tokenHash: string;
  authVersion: number;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

describe('PersistentSessionService', () => {
  const user = { id: 7, authVersion: 0, username: 'cadista', email: 'a@example.com' };
  let row: SessionRow | null;
  let prisma: unknown;
  let findUser: jest.Mock;
  let service: PersistentSessionService;

  beforeEach(() => {
    row = null;
    findUser = jest.fn(async () => user);
    prisma = {
      user: { findUnique: findUser },
      persistentSession: {
        create: jest.fn(
          async ({ data }: { data: Pick<SessionRow, 'userId' | 'tokenHash' | 'authVersion'> }) => {
            row = { id: 1, ...data, lastUsedAt: null, revokedAt: null };
            return row;
          },
        ),
        findUnique: jest.fn(async ({ where }: { where: { tokenHash: string } }) =>
          row?.tokenHash === where.tokenHash ? row : null,
        ),
        updateMany: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id?: number; tokenHash?: string };
            data: Partial<SessionRow>;
          }) => {
            if (
              !row ||
              (where.id && row.id !== where.id) ||
              (where.tokenHash && row.tokenHash !== where.tokenHash) ||
              row.revokedAt
            )
              return { count: 0 };
            Object.assign(row, data);
            return { count: 1 };
          },
        ),
      },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
    };
    service = new PersistentSessionService(
      prisma as PrismaService,
      {
        buildTokenResponse: () => ({ access_token: 'new-access', token_type: 'bearer' }),
      } as unknown as AuthService,
    );
  });

  it('stores only a hash, rotates after days, and rejects replay and revocation', async () => {
    const initial = await service.create(user.id);
    expect(initial.refresh_token).toMatch(/^[a-f0-9]{64}$/);
    expect(row?.tokenHash).not.toBe(initial.refresh_token);
    const next = await service.refresh(initial.refresh_token);
    expect(next.access_token).toBe('new-access');
    expect(next.refresh_token).not.toBe(initial.refresh_token);
    expect(row?.lastUsedAt).toBeInstanceOf(Date);
    await expect(service.refresh(initial.refresh_token)).rejects.toThrow();
    await service.revoke(next.refresh_token);
    await expect(service.refresh(next.refresh_token)).rejects.toThrow();
  });

  it('rejects a session after auth version changes', async () => {
    const initial = await service.create(user.id);
    findUser.mockResolvedValueOnce({ ...user, authVersion: 1 });
    await expect(service.refresh(initial.refresh_token)).rejects.toThrow();
  });

  it('allows only one rotation of a credential', async () => {
    const initial = await service.create(user.id);
    const outcomes = await Promise.allSettled([
      service.refresh(initial.refresh_token),
      service.refresh(initial.refresh_token),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
  });
});
