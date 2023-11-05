import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/users/users.module';
import { SessionModule } from '@/session/session.module';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ConfirmModule } from '@/confirm/confirm.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { MailModule } from '@/mail/mail.module';

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
  providers: [AuthService, IsExist, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
