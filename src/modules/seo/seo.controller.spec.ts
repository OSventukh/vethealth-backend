import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AiProviderException } from '@/modules/ai/ai.service';
import { ROLES_KEY } from '@/roles/decorators/roles.decorator';
import { RoleEnum } from '@/roles/roles.enum';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

// `ai` і `@ai-sdk/*` — ESM-only: приїжджають транзитивно через AiService.
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: jest.fn() }));
jest.mock('ai', () => ({
  generateObject: jest.fn(),
  createProviderRegistry: jest.fn(),
  APICallError: { isInstance: () => false },
  NoObjectGeneratedError: { isInstance: () => false },
  RetryError: { isInstance: () => false },
}));

const ID = '11111111-1111-4111-8111-111111111111';

describe('SeoController', () => {
  let app: INestApplication;
  let generate: jest.Mock;
  let update: jest.Mock;

  beforeEach(async () => {
    generate = jest.fn().mockResolvedValue({ metaTitle: 'Новий' });
    update = jest.fn().mockResolvedValue({ metaTitle: 'Новий' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeoController],
      providers: [
        {
          provide: SeoService,
          useValue: { findEntries: jest.fn(), generate, update },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    // Як у main.ts: невідомі поля тіла відхиляються.
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('is restricted to Admin+', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SeoController)).toEqual([
      RoleEnum.SuperAdmin,
      RoleEnum.Admin,
    ]);
  });

  it('generates the requested fields for an entity', async () => {
    const response = await request(app.getHttpServer())
      .post(`/seo/topic/${ID}/generate`)
      .send({ fields: ['metaTitle'], hint: 'коротше' });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ metaTitle: 'Новий' });
    expect(generate).toHaveBeenCalledWith(
      'topic',
      ID,
      expect.objectContaining({ fields: ['metaTitle'], hint: 'коротше' }),
    );
  });

  it.each([
    ['an unknown type', `/seo/category/${ID}/generate`, {}],
    ['a non-uuid id', '/seo/post/42/generate', {}],
    ['an unknown field', `/seo/post/${ID}/generate`, { fields: ['ogImage'] }],
  ])('rejects %s with 400', async (_case, url, body) => {
    const response = await request(app.getHttpServer()).post(url).send(body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(generate).not.toHaveBeenCalled();
  });

  it('forwards the provider backoff as Retry-After', async () => {
    generate.mockRejectedValue(
      new AiProviderException('rate limit', HttpStatus.TOO_MANY_REQUESTS, 9),
    );

    const response = await request(app.getHttpServer())
      .post(`/seo/post/${ID}/generate`)
      .send({});

    expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(response.headers['retry-after']).toBe('9');
  });

  it('saves only the SEO fields and rejects anything else', async () => {
    const ok = await request(app.getHttpServer())
      .patch(`/seo/page/${ID}`)
      .send({ metaTitle: 'Новий' });
    const extra = await request(app.getHttpServer())
      .patch(`/seo/page/${ID}`)
      .send({ ogImage: 'evil.jpg' });

    expect(ok.status).toBe(HttpStatus.OK);
    expect(update).toHaveBeenCalledWith('page', ID, { metaTitle: 'Новий' });
    expect(extra.status).toBe(HttpStatus.BAD_REQUEST);
  });
});
