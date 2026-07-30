import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';

import type { EnvironmentVariables } from '../config/app.config';
import { UserService } from '../user/user.service';
import type { AuthTokenResponse, AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables>,
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
      access_token: this.createAccessToken(user.username),
      email: user.email,
      token_type: 'bearer',
      username: user.username,
    };
  }

  async findAuthenticatedUserByUsername(username: string): Promise<AuthenticatedUser | null> {
    const user = await this.users.getUserByUsername(username);
    return user === null ? null : this.buildAuthenticatedUser(user);
  }

  private createAccessToken(username: string): string {
    return this.jwt.sign(
      {
        sub: username,
      },
      {
        algorithm: this.config.getOrThrow('ALGORITHM'),
        expiresIn: `${this.config.getOrThrow<number>('ACCESS_TOKEN_EXPIRE_MINUTES')}m`,
      },
    );
  }
}
