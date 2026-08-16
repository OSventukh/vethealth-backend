import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AiController } from './ai.controller';
import { AiProviderException, AiService } from './ai.service';

// `ai` і `@ai-sdk/*` — ESM-only: приїжджають транзитивно через AiService
// (сам сервіс тут застабано), тож досить порожніх фабрик.
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

// Контролер бере `@Res({ passthrough: true })` заради одного заголовка —
// перевіряємо на справжньому HTTP, що звичайна відповідь від цього не
// зламалася, а Retry-After таки доїжджає до клієнта.
describe('AiController', () => {
  let app: INestApplication;
  let generateSeoMetadata: jest.Mock;

  const RESULT = {
    metaTitle: 'Тестовий meta title',
    metaDescription: 'Тестовий meta description',
    metaKeywords: 'котики, песики',
    ogTitle: 'OG title',
    ogDescription: 'OG description',
  };

  const body = { title: 'Титул', text: 'Текст статті', entityType: 'post' };

  beforeEach(async () => {
    generateSeoMetadata = jest.fn().mockResolvedValue(RESULT);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: { generateSeoMetadata } }],
      // Гард тротлера тут не реєструється — він глобальний в app.module,
      // а @Throttle лишає тільки метадані.
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the generated metadata with 200', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/seo-metadata')
      .send(body);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual(RESULT);
    expect(response.headers['retry-after']).toBeUndefined();
  });

  it('forwards the provider backoff as Retry-After on 429', async () => {
    generateSeoMetadata.mockRejectedValue(
      new AiProviderException(
        'AI provider rate limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
        12,
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/ai/seo-metadata')
      .send(body);

    expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(response.headers['retry-after']).toBe('12');
  });

  it('leaves other failures untouched', async () => {
    generateSeoMetadata.mockRejectedValue(
      new AiProviderException('AI generation failed', HttpStatus.BAD_GATEWAY),
    );

    const response = await request(app.getHttpServer())
      .post('/ai/seo-metadata')
      .send(body);

    expect(response.status).toBe(HttpStatus.BAD_GATEWAY);
    expect(response.headers['retry-after']).toBeUndefined();
  });
});
