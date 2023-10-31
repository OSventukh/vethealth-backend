import { UsersService } from '@/users/users.service';
import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
import { SessionService } from '@/session/session.service';
import { UserEntity } from '@/users/entities/user.entity';
import { SessionEntity } from '@/session/entities/session.entity';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { LoginResponseType } from './types/login-response.type';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { ForgotService } from '@/forgot/forgot.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly forgotService: ForgotService,
  ) {}

  async validateLogin(authDto: AuthLoginDto): Promise<LoginResponseType> {
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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOne({ email });

    if (!user) {
      throw new UnprocessableEntityException(ERROR_MESSAGE.EMAIL_NOT_EXIST);
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    await this.forgotService.create({
      hash,
      user,
    });
  }

  async resetPassword(hash: string, password: string): Promise<void> {
    const forgot = await this.forgotService.findOne({ hash });

    if (!forgot) {
      throw new UnprocessableEntityException();
    }

    const user = forgot.user;

    await this.sessionService.softDelete({ user: { id: user.id } });

    await this.usersService.update({ id: user.id, password });

    await this.forgotService.softDelete(forgot.id);
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

  private async getTokensData(data: {
    id: UserEntity['id'];
    role: UserEntity['role'];
    sessionId: SessionEntity['id'];
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [token, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
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
      await this.jwtService.signAsync(
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
