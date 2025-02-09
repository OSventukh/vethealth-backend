import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createMock } from '@golevelup/ts-jest';

import { ConfirmService } from './confirm.service';
import { ConfirmEntity } from './entities/confirm.entity';

describe('ConfirmService', () => {
  let service: ConfirmService;
  const CONFIRM_REPOSITORY_TOKEN = getRepositoryToken(ConfirmEntity);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmService,
        {
          provide: CONFIRM_REPOSITORY_TOKEN,
          useValue: createMock<Repository<ConfirmEntity>>(),
        },
      ],
    }).compile();

    service = module.get<ConfirmService>(ConfirmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
