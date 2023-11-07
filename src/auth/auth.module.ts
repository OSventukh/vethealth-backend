import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/users/users.module';
import { SessionModule } from '@/session/session.module';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ConfirmModule } from '@/confirm/confirm.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AnonymousStrategy } from './strategies/anonymous.strategy';
import { MailModule } from '@/mail/mail.module';
import { AuthDataGuard } from './guards/auth-data.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';

@Module({
  imports: [
    JwtModule.register({}),
    PassportModule,
    UsersModule,
    SessionModule,
    ConfirmModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    IsExist,
    JwtStrategy,
    JwtRefreshStrategy,
    AnonymousStrategy,
    {
      provide: APP_GUARD,
      useClass: AuthDataGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
