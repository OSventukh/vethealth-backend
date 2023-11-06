import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@/mailer/mailer.service';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MailerService, useValue: createMock<MailerService>() },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService<AllConfigType>>(),
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
