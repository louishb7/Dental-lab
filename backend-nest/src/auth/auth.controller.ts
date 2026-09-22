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

import type { Request, Response } from 'express';
import { setTimeout as delay } from 'node:timers/promises';

import { AccountLockedError } from '../user/account-locked.error';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import type { AuthTokenResponse, AuthUserResponse } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { AuthLoginRequestDto } from './dto/auth-login-request.dto';
import { AuthRegisterRequestDto } from './dto/auth-register-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitService } from './login-rate-limit.service';
import { PasswordResetService, RECOVERY_MESSAGE } from './password-reset.service';
import { RecoveryRateLimitService } from './recovery-rate-limit.service';
import {
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
} from './dto/password-reset-request.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly loginRateLimit: LoginRateLimitService,
    private readonly users: UserService,
    private readonly passwordResets: PasswordResetService,
    private readonly recoveryRateLimit: RecoveryRateLimitService,
  ) {}

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(
    @Body() payload: ForgotPasswordRequestDto,
    @Req() request: Request,
  ): Promise<{ detail: string }> {
    const allowed = this.recoveryRateLimit.allow(request.ip ?? 'unknown', payload.email);
    // Same response floor for missing accounts and suppressed requests; covers the provider timeout.
    await Promise.all([
      delay(5500),
      allowed ? this.passwordResets.request(payload.email) : Promise.resolve(),
    ]);
    return { detail: RECOVERY_MESSAGE };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body() payload: ResetPasswordRequestDto,
    @Req() request: Request,
  ): Promise<{ detail: string }> {
    if (this.loginRateLimit.registerLoginAttempt(`reset:${request.ip ?? 'unknown'}`) !== null) {
      throw new HttpException({ detail: 'Muitas tentativas. Tente novamente mais tarde.' }, 429);
    }
    await this.passwordResets.reset(payload.token, payload.password);
    return { detail: 'Senha redefinida. Faça login com sua nova senha.' };
  }

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
    const clientId = request.ip ?? 'unknown';
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
