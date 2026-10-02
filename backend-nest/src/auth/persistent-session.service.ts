import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const invalid = () => new UnauthorizedException({ detail: 'Sessão inválida ou revogada' });
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const valid = (token: unknown): token is string =>
  typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

@Injectable()
export class PersistentSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async create(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw invalid();
    const refresh_token = randomBytes(32).toString('hex');
    await this.prisma.persistentSession.create({
      data: { userId, tokenHash: hash(refresh_token), authVersion: user.authVersion },
    });
    return { refresh_token };
  }

  async refresh(token: unknown) {
    if (!valid(token)) throw invalid();
    const next = randomBytes(32).toString('hex');
    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.persistentSession.findUnique({ where: { tokenHash: hash(token) } });
      if (!session || session.revokedAt) throw invalid();
      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user || user.authVersion !== session.authVersion) throw invalid();
      const updated = await tx.persistentSession.updateMany({
        where: { id: session.id, tokenHash: hash(token), revokedAt: null },
        data: { tokenHash: hash(next), lastUsedAt: new Date() },
      });
      if (updated.count !== 1) throw invalid();
      return user;
    });
    return { ...this.auth.buildTokenResponse(result), refresh_token: next };
  }

  async revoke(token: unknown) {
    if (!valid(token)) return;
    await this.prisma.persistentSession.updateMany({
      where: { tokenHash: hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
