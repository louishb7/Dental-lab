import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { EnvironmentVariables } from '../../config/app.config';
import { AuthService } from '../auth.service';
import type { AuthenticatedUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvironmentVariables>,
    private readonly auth: AuthService,
  ) {
    super({
      algorithms: [config.getOrThrow('ALGORITHM')],
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('SECRET_KEY'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException({
        detail: 'Token inválido ou expirado',
      });
    }

    const user = await this.auth.findAuthenticatedUserByUsername(payload.sub);
    if (user === null) {
      throw new UnauthorizedException({
        detail: 'Usuário autenticado não encontrado',
      });
    }

    return user;
  }
}
