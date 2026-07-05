import { UsersService } from '@/modules/users/users.service';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import ms from 'ms';

import { AuthLoginDto } from './dto/auth-login.dto';
import { comparePassword } from '@/utils/password-hash';
import { UserStatusEnum } from '@/statuses/user-statuses.enum';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthConfirmDto } from './dto/auth-confirm.dto';
import { SessionService } from '@/modules/session/session.service';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import type { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { LoginResponseType } from './types/login-response.type';
import type { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { ConfirmService } from '@/modules/confirm/confirm.service';
import { MailService } from '@/mail/mail.service';
import { LoginRequestType } from './types/login-request.type';
import { AuthChangePasswordDto } from './dto/auth-change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly confirmService: ConfirmService,
    private readonly mailService: MailService,
  ) {}

  async validateLogin(authDto: AuthLoginDto): Promise<LoginResponseType> {
    const user = await this.usersService.findOne({ email: authDto.email });
    if (!user) {
      throw new UnprocessableEntityException();
    }

    if (user.status.id === UserStatusEnum.Pending) {
      throw new UnprocessableEntityException(
        ERROR_MESSAGE.USER_IS_NOT_CONFIRMED,
      );
    }

    const isValid = await comparePassword(authDto.password, user.password);

    if (!isValid) {
      throw new UnprocessableEntityException();
    }

    const session = await this.sessionService.create({
      user,
    });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
    });

    return {
      refreshToken,
      token,
      tokenExpires,
      user,
    };
  }

  async logout(data: Pick<JwtRefreshPayloadType, 'sessionId'>) {
    return this.sessionService.softDelete({
      id: data.sessionId,
    });
  }

  async register(createUserDto: AuthRegisterDto): Promise<UserEntity> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const user = await this.usersService.create({
      ...createUserDto,
      status: { id: UserStatusEnum.Pending } as UserStatusEntity,
    });

    await this.confirmService.create({
      hash,
      user,
      expiresIn: new Date(Date.now() + ms('1d')),
    });

    try {
      await this.mailService.userSignUp({
        to: createUserDto.email,
        data: { hash },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send sign-up confirmation email to ${createUserDto.email}`,
        error instanceof Error ? error.stack : error,
      );
      throw new ServiceUnavailableException(ERROR_MESSAGE.EMAIL_SEND_FAILED);
    }

    return {
      id: user.id,
      firstname: user.firstname,
      email: user.email,
    } as UserEntity;
  }

  async getPendingUser(confirmationToken: string): Promise<UserEntity> {
    const confirm = await this.confirmService.findOne({
      hash: confirmationToken,
    });

    if (!confirm) {
      throw new UnprocessableEntityException(ERROR_MESSAGE.USER_IS_NOT_EXIST);
    }

    const user = confirm.user;

    return {
      firstname: user.firstname,
      email: user.email,
    } as UserEntity;
  }

  async confirm(confirmDto: AuthConfirmDto): Promise<{ message: string }> {
    const confirm = await this.confirmService.findOne({
      hash: confirmDto.hash,
    });

    if (!confirm) {
      throw new UnprocessableEntityException(ERROR_MESSAGE.USER_IS_NOT_EXIST);
    }

    if (confirm.expiresIn.getTime() < Date.now()) {
      await this.confirmService.delete(confirm.id);
      throw new UnprocessableEntityException(
        ERROR_MESSAGE.CONFIRMATION_TOKEN_HAS_EXPIRED,
      );
    }

    const user = confirm.user;

    await this.sessionService.softDelete({ user: { id: user.id } });

    await this.usersService.update({
      id: user.id,
      password: confirmDto.password,
      status: { id: UserStatusEnum.Active },
    });

    await this.confirmService.delete(confirm.id);
    return { message: 'Email confirmed successfully' };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOne({ email });

    if (!user) {
      throw new UnprocessableEntityException(ERROR_MESSAGE.EMAIL_NOT_EXIST);
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    await this.confirmService.create({
      hash,
      user,
      expiresIn: new Date(Date.now() + ms('1d')),
    });

    try {
      await this.mailService.forgotPassword({
        to: email,
        data: {
          hash,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error instanceof Error ? error.stack : error,
      );
      throw new ServiceUnavailableException(ERROR_MESSAGE.EMAIL_SEND_FAILED);
    }
  }

  async changePassword(
    authUser: Pick<JwtPayloadType, 'id' | 'sessionId'>,
    changePasswordDto: AuthChangePasswordDto,
  ): Promise<void> {
    const { password } = changePasswordDto;
    const user = await this.usersService.findOne({ id: authUser.id });

    if (!user) {
      throw new UnprocessableEntityException(ERROR_MESSAGE.USER_IS_NOT_EXIST);
    }

    const isValid = await comparePassword(changePasswordDto.oldPassword, user.password);

    if (!isValid) {
      throw new UnprocessableEntityException(ERROR_MESSAGE.OLD_PASSWORD_IS_NOT_MATCH);
    }
    
    await this.usersService.update({
      id: authUser.id,
      password,
    });

    await this.sessionService.softDelete({
      user: { id: authUser.id },
      excludeId: authUser.sessionId,
    });
    // Password is already persisted above; the email is only a notification,
    // so a send failure must not fail the request — log and continue.
    try {
      await this.mailService.changePassword({
        to: user.email,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password-change notification email to ${user.email}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async refreshTokens(
    data: Pick<JwtRefreshPayloadType, 'sessionId'>,
  ): Promise<Omit<LoginResponseType, 'user'>> {
    const session = await this.sessionService.findOne({
      id: data.sessionId,
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: session.user.id,
      role: session.user.role,
      sessionId: session.id,
    });

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  getCurrentUser(userJwtPayload: JwtPayloadType): Promise<UserEntity | null> {
    return this.usersService.findOne({
      id: userJwtPayload.id,
    });
  }

  private async getTokensData(data: LoginRequestType) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }
}
