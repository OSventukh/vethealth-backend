import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '@/users/users.module';
import { SessionModule } from '@/session/session.module';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ForgotModule } from '@/forgot/forgot.module';
@Module({
  imports: [
    JwtModule.register({}),
    PassportModule,
    UsersModule,
    SessionModule,
    ForgotModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, IsExist],
})
export class AuthModule {}
