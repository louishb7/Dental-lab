import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { EnvironmentVariables } from '../../config/app.config';
import { AuthService } from '../auth.service';
import { JWT_ALGORITHM } from '../security.constants';
import type { AuthenticatedUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvironmentVariables>,
    private readonly auth: AuthService,
  ) {
    super({
      algorithms: [JWT_ALGORITHM],
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('SECRET_KEY'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.exp !== 'number' ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException({
        detail: 'Token inválido ou expirado',
      });
    }

    // Pre-migration JWTs represent version zero, and are revoked by the first reset.
    const version = payload.authVersion === undefined ? 0 : payload.authVersion;
    if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
      throw new UnauthorizedException({ detail: 'Token inválido ou expirado' });
    }
    const user = await this.auth.findAuthenticatedUserByUsername(payload.sub, version);
    if (user === null) {
      throw new UnauthorizedException({
        detail: 'Usuário autenticado não encontrado',
      });
    }

    return user;
  }
}
