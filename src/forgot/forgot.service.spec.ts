import { Test, TestingModule } from '@nestjs/testing';
import { ForgotService } from './forgot.service';
import { ForgotEntity } from './entities/forgot.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createMock } from '@golevelup/ts-jest';

describe('ForgotService', () => {
  let service: ForgotService;
  const FORGOT_REPOSITORY_TOKEN = getRepositoryToken(ForgotEntity);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForgotService,
        {
          provide: FORGOT_REPOSITORY_TOKEN,
          useValue: createMock<Repository<ForgotEntity>>(),
        },
      ],
    }).compile();

    service = module.get<ForgotService>(ForgotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
