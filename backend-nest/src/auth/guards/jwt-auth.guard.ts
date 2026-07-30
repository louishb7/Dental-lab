import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(
    error: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const response = context.switchToHttp().getResponse<Response>();

    if (error !== null && error !== undefined) {
      if (error instanceof UnauthorizedException) {
        response.setHeader('WWW-Authenticate', 'Bearer');
      }
      throw error;
    }

    if (!user) {
      response.setHeader('WWW-Authenticate', 'Bearer');
      throw new UnauthorizedException({
        detail: 'Token inválido ou expirado',
      });
    }

    return user;
  }
}
