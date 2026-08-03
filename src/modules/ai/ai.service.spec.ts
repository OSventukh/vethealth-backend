import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { AiService, validateSeoMetadata } from './ai.service';

jest.mock('ai', () => ({
  generateObject: jest.fn(),
  jsonSchema: (schema: unknown) => schema,
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => jest.fn(() => 'anthropic-model')),
}));
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn(() => 'openai-model')),
}));
jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => jest.fn(() => 'google-model')),
}));

const generateObjectMock = generateObject as jest.Mock;

const RESULT = {
  metaTitle: 'Тестовий meta title',
  metaDescription: 'Тестовий meta description',
  metaKeywords: 'котики, песики',
  ogTitle: 'OG title',
  ogDescription: 'OG description',
};

describe('AiService', () => {
  let service: AiService;
  let aiConfig: Record<string, unknown>;

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key.startsWith('ai.') ? aiConfig[key.slice(3)] : undefined,
            ),
            getOrThrow: jest.fn((key: string) => {
              const value = key.startsWith('ai.') && aiConfig[key.slice(3)];
              if (!value) {
                throw new Error(`missing config ${key}`);
              }
              return value;
            }),
          },
        },
      ],
    }).compile();

    return module.get<AiService>(AiService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aiConfig = { provider: 'anthropic', anthropicApiKey: 'test-key' };
    generateObjectMock.mockResolvedValue({ object: RESULT });
  });

  it('generates seo metadata with the anthropic default model', async () => {
    service = await createService();

    const result = await service.generateSeoMetadata({
      title: 'Отруєння у собак',
      text: 'Текст статті про отруєння.',
      topics: ['Собаки'],
    });

    expect(result).toEqual(RESULT);
    expect(createAnthropic).toHaveBeenCalledWith({ apiKey: 'test-key' });
    const anthropicFactory = (createAnthropic as jest.Mock).mock.results[0]
      .value as jest.Mock;
    expect(anthropicFactory).toHaveBeenCalledWith('claude-opus-5');

    const callArgs = generateObjectMock.mock.calls[0][0];
    expect(callArgs.model).toBe('anthropic-model');
    expect(callArgs.prompt).toContain('Отруєння у собак');
    expect(callArgs.prompt).toContain('Текст статті про отруєння.');
    expect(callArgs.prompt).toContain('Собаки');
    // Захист від провайдера, що завис: генерація завжди з таймаутом
    expect(callArgs.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('uses the configured provider and model override', async () => {
    aiConfig = {
      provider: 'openai',
      model: 'gpt-5.2-mini',
      openaiApiKey: 'openai-key',
    };
    service = await createService();

    await service.generateSeoMetadata({ title: 'Титул', text: 'Текст' });

    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'openai-key' });
    const openaiFactory = (createOpenAI as jest.Mock).mock.results[0]
      .value as jest.Mock;
    expect(openaiFactory).toHaveBeenCalledWith('gpt-5.2-mini');
    expect(createGoogleGenerativeAI).not.toHaveBeenCalled();
  });

  it('throws 503 when the configured provider has no api key', async () => {
    aiConfig = { provider: 'google' };
    service = await createService();

    await expect(
      service.generateSeoMetadata({ title: 'Титул', text: 'Текст' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it('truncates overly long text before sending it to the model', async () => {
    service = await createService();

    await service.generateSeoMetadata({
      title: 'Титул',
      text: 'а'.repeat(20000),
    });

    const callArgs = generateObjectMock.mock.calls[0][0];
    // 12000 символів тексту + промт-обгортка, але точно не всі 20000
    expect(callArgs.prompt.length).toBeLessThan(13000);
  });

  it('maps generation failures to 502', async () => {
    generateObjectMock.mockRejectedValue(new Error('upstream boom'));
    service = await createService();

    await expect(
      service.generateSeoMetadata({ title: 'Титул', text: 'Текст' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('validateSeoMetadata', () => {
  it('accepts a complete result and trims the values', () => {
    const result = validateSeoMetadata({
      ...RESULT,
      metaTitle: '  Тестовий meta title  ',
    });

    expect(result).toEqual({
      success: true,
      value: { ...RESULT, metaTitle: 'Тестовий meta title' },
    });
  });

  it('rejects a result with a missing field', () => {
    const { ogDescription: _ogDescription, ...incomplete } = RESULT;

    const result = validateSeoMetadata(incomplete);

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.message).toContain('ogDescription');
    }
  });

  it('rejects empty strings and non-string values', () => {
    expect(validateSeoMetadata({ ...RESULT, metaTitle: '   ' }).success).toBe(
      false,
    );
    expect(validateSeoMetadata({ ...RESULT, metaKeywords: 42 }).success).toBe(
      false,
    );
    expect(validateSeoMetadata(null).success).toBe(false);
    expect(validateSeoMetadata('текст').success).toBe(false);
  });
});
