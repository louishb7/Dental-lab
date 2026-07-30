import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

import { AccountLockedError } from '../user/account-locked.error';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import type { AuthTokenResponse, AuthUserResponse } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { AuthLoginRequestDto } from './dto/auth-login-request.dto';
import { AuthRegisterRequestDto } from './dto/auth-register-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitService } from './login-rate-limit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly loginRateLimit: LoginRateLimitService,
    private readonly users: UserService,
  ) {}

  @Post('register')
  async register(@Body() payload: AuthRegisterRequestDto): Promise<AuthTokenResponse> {
    try {
      const user = await this.users.createUser(payload);
      return this.auth.buildTokenResponse(user);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Já existe')) {
        throw new ConflictException({
          detail: error.message,
        });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new HttpException(
          {
            detail: 'Banco de dados indisponível para cadastrar usuário',
          },
          503,
        );
      }

      throw error;
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() payload: AuthLoginRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponse> {
    const clientId = request.socket.remoteAddress ?? 'unknown';
    const retryAfter = this.loginRateLimit.registerLoginAttempt(clientId);
    if (retryAfter !== null) {
      response.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        {
          detail: 'Muitas tentativas. Tente novamente mais tarde.',
        },
        429,
      );
    }

    const identifier = payload.getIdentifier();
    if (identifier === null) {
      throw new UnprocessableEntityException({
        detail: [
          {
            loc: ['body', 'identifier'],
            msg: 'Field required',
          },
        ],
      });
    }

    try {
      const user = await this.users.authenticateUser(identifier, payload.password);
      if (user === null) {
        response.setHeader('WWW-Authenticate', 'Bearer');
        throw new UnauthorizedException({
          detail: 'Credenciais inválidas',
        });
      }

      return this.auth.buildTokenResponse(user);
    } catch (error) {
      if (error instanceof AccountLockedError) {
        const remainingSeconds = Math.max(
          1,
          Math.floor((error.lockedUntil.getTime() - Date.now()) / 1000),
        );
        response.setHeader('Retry-After', String(remainingSeconds));
        response.setHeader('WWW-Authenticate', 'Bearer');
        throw new HttpException(
          {
            detail: 'Conta temporariamente bloqueada. Tente novamente mais tarde.',
          },
          423,
        );
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new HttpException(
          {
            detail: 'Banco de dados indisponível para autenticar usuário',
          },
          503,
        );
      }

      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  readMe(@CurrentUser() user: AuthUserResponse): AuthUserResponse {
    return {
      email: user.email,
      id: user.id,
      username: user.username,
    };
  }
}
