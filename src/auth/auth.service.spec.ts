import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { createMock } from '@golevelup/ts-jest';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '@/session/session.service';
import { ConfigService } from '@nestjs/config';
import { ForgotService } from '@/forgot/forgot.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: AuthService, useValue: createMock<AuthService>() },
        { provide: SessionService, useValue: createMock<SessionService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
        { provide: ForgotService, useValue: createMock<ForgotService>() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
