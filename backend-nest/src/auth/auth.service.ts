import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';

import { UserService } from '../user/user.service';
import type { AuthTokenResponse, AuthenticatedUser } from './auth.types';
import { ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM } from './security.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UserService,
  ) {}

  buildAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      email: user.email,
      id: user.id,
      username: user.username,
    };
  }

  buildTokenResponse(user: User): AuthTokenResponse {
    return {
      access_token: this.createAccessToken(user),
      email: user.email,
      token_type: 'bearer',
      username: user.username,
    };
  }

  async findAuthenticatedUserByUsername(
    username: string,
    authVersion: number,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.users.getUserByUsername(username);
    return user === null || user.authVersion !== authVersion
      ? null
      : this.buildAuthenticatedUser(user);
  }

  private createAccessToken(user: User): string {
    return this.jwt.sign(
      {
        sub: user.username,
        authVersion: user.authVersion,
      },
      {
        algorithm: JWT_ALGORITHM,
        expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m`,
      },
    );
  }
}
