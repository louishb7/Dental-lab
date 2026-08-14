import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import bcrypt from 'bcryptjs';

import {
  ACCOUNT_LOCK_MAX_ATTEMPTS,
  ACCOUNT_LOCK_MINUTES,
  PASSWORD_HASH_ROUNDS,
} from '../auth/security.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AccountLockedError } from './account-locked.error';

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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

    let lockedUntilAfterTransaction: Date | null = null;
    const authenticatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${user.id} FOR UPDATE`;

      let currentUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const now = new Date();

      if (currentUser.lockedUntil !== null && currentUser.lockedUntil <= now) {
        currentUser = await tx.user.update({
          where: { id: currentUser.id },
          data: {
            lockedUntil: null,
            failedLoginAttempts: 0,
            lastFailedLoginAt: null,
          },
        });
      }

      if (currentUser.lockedUntil !== null && currentUser.lockedUntil > now) {
        throw new AccountLockedError(currentUser.lockedUntil);
      }

      if (!(await bcrypt.compare(password, currentUser.passwordHash))) {
        const failedLoginAttempts = currentUser.failedLoginAttempts + 1;

        if (failedLoginAttempts >= ACCOUNT_LOCK_MAX_ATTEMPTS) {
          const lockedUntil = new Date(now.getTime() + ACCOUNT_LOCK_MINUTES * 60_000);
          lockedUntilAfterTransaction = lockedUntil;
          await tx.user.update({
            where: { id: currentUser.id },
            data: {
              failedLoginAttempts: 0,
              lastFailedLoginAt: now,
              lockedUntil,
            },
          });
          return null;
        }

        await tx.user.update({
          where: { id: currentUser.id },
          data: {
            failedLoginAttempts,
            lastFailedLoginAt: now,
          },
        });
        return null;
      }

      return tx.user.update({
        where: { id: currentUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastFailedLoginAt: null,
          lastLoginAt: now,
        },
      });
    });

    if (lockedUntilAfterTransaction !== null) {
      throw new AccountLockedError(lockedUntilAfterTransaction);
    }

    return authenticatedUser;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  }
}
