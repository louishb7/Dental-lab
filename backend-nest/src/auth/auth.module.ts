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
<<<<<<< HEAD
            expiresIn: `${expiresInMinutes}m`,
            algorithm: config.getOrThrow('ALGORITHM'),
=======
            ...(ACCESS_TOKEN_EXPIRE_MINUTES > 0
              ? { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
              : {}),
            algorithm: JWT_ALGORITHM,
>>>>>>> 3853a78 (refactor: streamline backend architecture and production deployment)
          },
        };
      },
    }),
    UserModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, LoginRateLimitService],
})
export class AuthModule {}
