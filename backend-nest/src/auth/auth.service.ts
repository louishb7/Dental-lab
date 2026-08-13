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
<<<<<<< HEAD
        algorithm: this.config.getOrThrow('ALGORITHM'),
        expiresIn: `${expiresInMinutes}m`,
=======
        algorithm: JWT_ALGORITHM,
        ...(ACCESS_TOKEN_EXPIRE_MINUTES > 0
          ? { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
          : {}),
>>>>>>> 3853a78 (refactor: streamline backend architecture and production deployment)
      },
    );
  }
}
