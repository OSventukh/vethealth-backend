import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { createMock } from '@golevelup/ts-jest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionEntity } from './entities/session.entity';
import { Repository } from 'typeorm';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const SESSION_REPOSITORY_TOKEN = getRepositoryToken(SessionEntity);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: SESSION_REPOSITORY_TOKEN,
          useValue: createMock<Repository<SessionEntity>>(),
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
