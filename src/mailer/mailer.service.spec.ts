import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from './mailer.service';
import { ConfigService } from '@nestjs/config';
import { createMock } from '@golevelup/ts-jest';
import { AllConfigType } from '@/config/config.type';

describe('MailerService', () => {
  let service: MailerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'mail.host':
                  return 'smtp.mailtrap.io';
                case 'mail.port':
                  return 2525;
                case 'mail.ignoreTLS':
                  return false;
                case 'mail.secure':
                  return false;
                case 'mail.requireTLS':
                  return true;
                case 'mail.user':
                  return 'user';
                case 'mail.password':
                  return 'password';
                case 'mail.rejectUnauthorized':
                  return false;
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailerService>(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
