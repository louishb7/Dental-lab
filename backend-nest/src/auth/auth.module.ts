import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import type { EnvironmentVariables } from '../config/app.config';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitService } from './login-rate-limit.service';
import { ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM } from './security.constants';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordResetService } from './password-reset.service';
import { RecoveryRateLimitService } from './recovery-rate-limit.service';
import { EmailService } from '../email/email.service';
import { ResendEmailService } from '../email/resend-email.service';
import { PersistentSessionService } from './persistent-session.service';

@Module({
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, LoginRateLimitService],
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables>) => {
        return {
          secret: config.getOrThrow('SECRET_KEY'),
          signOptions: {
            ...(ACCESS_TOKEN_EXPIRE_MINUTES > 0
              ? { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
              : {}),
            algorithm: JWT_ALGORITHM,
          },
        };
      },
    }),
    UserModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    LoginRateLimitService,
    PasswordResetService,
    RecoveryRateLimitService,
    PersistentSessionService,
    { provide: EmailService, useClass: ResendEmailService },
  ],
})
export class AuthModule {}
