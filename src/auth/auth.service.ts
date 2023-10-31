import { UsersService } from '@/users/users.service';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthLoginDto } from './dto/auth-login.dto';
import { comparePassword } from '@/utils/password-hash';
import { UserStatusEnum } from '@/statuses/user-statuses.enum';
import crypto from 'crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import ms from 'ms';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthConfirmDto } from './dto/auth-confirm.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async validateLogin(authDto: AuthLoginDto) {
    const user = await this.usersService.findOne({ email: authDto.email });
    if (!user) {
      throw new UnprocessableEntityException();
    }

    if (user.status.id === UserStatusEnum.Pending) {
      throw new UnprocessableEntityException('Confirm you email');
    }

    const isValid = await comparePassword(authDto.password, user.password);

    if (!isValid) {
      throw new UnprocessableEntityException();
    }
  }

  logout() {
    return 'logout';
  }

  async register(createUserDto: AuthRegisterDto): Promise<void> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    await this.usersService.create({
      ...createUserDto,
      status: { id: UserStatusEnum.Pending } as UserStatusEntity,
      confirmationToken: hash,
      confirmationTokenExpires: Date.now() + ms('1d'),
    });
  }

  async confirm(confirmDto: AuthConfirmDto): Promise<void> {
    const user = await this.usersService.findOne({
      confirmationToken: confirmDto.сonfirmationToken,
    });

    if (!user) {
      throw new UnprocessableEntityException();
    }

    if (user.confirmationTokenExpires < Date.now()) {
      throw new UnprocessableEntityException('Confirmation token has expired');
    }

    await this.usersService.update({
      id: user.id,
      confirmationToken: null,
      confirmationTokenExpires: null,
      status: { id: UserStatusEnum.Active },
    });
  }

  forgorPassword() {
    return 'forgot password';
  }

  resetPassword() {
    return 'reset password';
  }

  refreshTokens() {
    return 'refresh tokens';
  }

  getCurrentUser() {
    return 'current user';
  }
}
