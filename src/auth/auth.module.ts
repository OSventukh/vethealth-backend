import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '@/users/users.module';
import { SessionModule } from '@/session/session.module';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ConfirmModule } from '@/confirm/confirm.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
@Module({
  imports: [
    JwtModule.register({}),
    PassportModule,
    UsersModule,
    SessionModule,
    ConfirmModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, IsExist, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
