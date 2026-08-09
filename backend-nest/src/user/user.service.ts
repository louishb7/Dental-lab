import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type User } from '@prisma/client';
import bcrypt from 'bcryptjs';

import type { EnvironmentVariables } from '../config/app.config';
import { PrismaService } from '../prisma/prisma.service';
import { AccountLockedError } from './account-locked.error';

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables>,
  ) {}

  async getUserByUsername(username: string): Promise<User | null> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        username: {
          equals: normalizedUsername,
          mode: 'insensitive',
        },
      },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });
  }

  async getUserByIdentifier(identifier: string): Promise<User | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (!normalizedIdentifier) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        OR: [
          {
            username: {
              equals: normalizedIdentifier,
              mode: 'insensitive',
            },
          },
          {
            email: {
              equals: normalizedIdentifier,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedUsername = input.username.trim();

    if ((await this.getUserByEmail(normalizedEmail)) !== null) {
      throw new Error('Já existe um usuário com este email');
    }

    if ((await this.getUserByUsername(normalizedUsername)) !== null) {
      throw new Error('Já existe um usuário com este nome de usuário');
    }

    try {
      return await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          username: normalizedUsername,
          passwordHash: await this.hashPassword(input.password),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Já existe um usuário com este email ou nome de usuário');
      }

      throw error;
    }
  }

  async authenticateUser(identifier: string, password: string): Promise<User | null> {
    const user = await this.getUserByIdentifier(identifier);
    if (user === null) {
      return null;
    }

    const now = new Date();
    const userAfterLockCleanup = await this.clearExpiredLock(user, now);

    if (userAfterLockCleanup.lockedUntil !== null && userAfterLockCleanup.lockedUntil > now) {
      throw new AccountLockedError(userAfterLockCleanup.lockedUntil);
    }

    if (!(await bcrypt.compare(password, userAfterLockCleanup.passwordHash))) {
      const failedUser = await this.registerFailedLogin(userAfterLockCleanup, now);
      if (failedUser.lockedUntil !== null) {
        throw new AccountLockedError(failedUser.lockedUntil);
      }

      return null;
    }

    return this.resetLoginSecurityState(userAfterLockCleanup.id, now);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.getOrThrow<number>('BCRYPT_ROUNDS'));
  }

  private async clearExpiredLock(user: User, now: Date): Promise<User> {
    if (user.lockedUntil !== null && user.lockedUntil <= now) {
      return this.prisma.user.update({
        where: { id: user.id },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
        },
      });
    }

    return user;
  }

  private async registerFailedLogin(user: User, now: Date): Promise<User> {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const maxAttempts = this.config.getOrThrow<number>('LOGIN_MAX_ATTEMPTS');

    if (failedLoginAttempts >= maxAttempts) {
      return this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lastFailedLoginAt: now,
          lockedUntil: new Date(
            now.getTime() + this.config.getOrThrow<number>('LOGIN_LOCKOUT_MINUTES') * 60_000,
          ),
        },
      });
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
        lastFailedLoginAt: now,
      },
    });
  }

  private async resetLoginSecurityState(userId: number, now: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
        lastLoginAt: now,
      },
    });
  }
}
