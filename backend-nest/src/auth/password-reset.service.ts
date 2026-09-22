import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { EnvironmentVariables } from '../config/app.config';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { assertPasswordPolicy } from './password-policy';

export const RECOVERY_MESSAGE =
  'Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir a senha.';
const INVALID_LINK = 'Link inválido ou expirado. Solicite novas instruções.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserService,
    private readonly email: EmailService,
    private readonly config: ConfigService<EnvironmentVariables>,
  ) {}

  async request(email: string): Promise<void> {
    try {
      const frontendUrl = this.config.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        this.logger.warn('Password recovery is not configured');
        return;
      }
      const delivery = await this.prisma.$transaction(async (tx) => {
        // Shared by all API instances: reserve global quota before generating a token.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(734291, 1)`;
        const user = await tx.user.findFirst({
          where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
        });
        if (!user) return null;
        await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${user.id} FOR UPDATE`;
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
        const recent = await tx.passwordReset.findMany({
          where: { userId: user.id, createdAt: { gt: dayAgo } },
          select: { createdAt: true },
        });
        if (
          recent.length >= 5 ||
          recent.filter((row) => row.createdAt.getTime() > now.getTime() - 60 * 60_000).length >=
            3 ||
          recent.some((row) => row.createdAt.getTime() > now.getTime() - 2 * 60_000)
        )
          return null;
        if ((await tx.passwordReset.count({ where: { createdAt: { gt: dayAgo } } })) >= 50) {
          this.logger.warn('Password recovery global limit reached');
          return null;
        }
        const token = randomBytes(32).toString('hex');
        await tx.passwordReset.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: now },
        });
        const reset = await tx.passwordReset.create({
          data: {
            userId: user.id,
            tokenHash: this.hashToken(token),
            createdAt: now,
            expiresAt: new Date(now.getTime() + 30 * 60_000),
          },
        });
        return { id: reset.id, to: user.email, token };
      });
      if (!delivery) return;
      const link = new URL(`${frontendUrl.replace(/\/+$/, '')}/reset-password`);
      link.hash = `token=${delivery.token}`;
      try {
        await this.email.send({
          to: delivery.to,
          subject: 'Redefina sua senha no Cadisk',
          text: `Para criar uma nova senha no Cadisk, abra o link abaixo. Ele expira em 30 minutos e só pode ser usado uma vez.\n\n${link.toString()}\n\nSe você não solicitou a redefinição, ignore este e-mail.`,
        });
      } catch {
        // Keep the quota reservation even on uncertain delivery; no automatic retries/email bombing.
        await this.prisma.passwordReset.updateMany({
          where: { id: delivery.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        this.logger.warn('Password recovery email delivery failed');
      }
    } catch {
      // Always keep public responses equivalent; internal failures remain observable without PII.
      this.logger.error('Password recovery request failed');
    }
  }

  async reset(token: string, password: string): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new BadRequestException({ detail: INVALID_LINK });
    assertPasswordPolicy(password);
    const tokenHash = this.hashToken(token);
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date())
      throw new BadRequestException({ detail: INVALID_LINK });
    const passwordHash = await this.users.hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      // Same user lock as login and issuance; re-read token after acquiring it.
      await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${reset.userId} FOR UPDATE`;
      const current = await tx.passwordReset.findUnique({ where: { tokenHash } });
      const now = new Date();
      if (!current || current.usedAt || current.expiresAt <= now)
        throw new BadRequestException({ detail: INVALID_LINK });
      await tx.user.update({
        where: { id: current.userId },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastFailedLoginAt: null,
        },
      });
      await tx.passwordReset.updateMany({
        where: { userId: current.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
