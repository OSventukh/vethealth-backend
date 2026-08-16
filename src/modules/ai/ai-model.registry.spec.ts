import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createProviderRegistry } from 'ai';
import { AiModelRegistry, DEFAULT_MODELS } from './ai-model.registry';
import { AiProvider } from '@/config/config.type';

// ESM-only пакети мокаємо фабриками; реєстр повертає id моделі рядком,
// щоб перевіряти саме адресацію `provider:model`.
jest.mock('ai', () => ({
  createProviderRegistry: jest.fn(() => ({
    languageModel: jest.fn((id: string) => `model:${id}`),
  })),
}));
jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => 'anthropic-provider'),
}));
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => 'openai-provider'),
}));
jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => 'google-provider'),
}));

describe('AiModelRegistry', () => {
  let registry: AiModelRegistry;
  let aiConfig: Record<string, unknown>;
  let configGet: jest.Mock;

  const createRegistry = async () => {
    configGet = jest.fn((key: string) =>
      key.startsWith('ai.') ? aiConfig[key.slice(3)] : undefined,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiModelRegistry,
        {
          provide: ConfigService,
          useValue: {
            get: configGet,
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

    return module.get<AiModelRegistry>(AiModelRegistry);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aiConfig = { provider: 'anthropic', anthropicApiKey: 'test-key' };
  });

  it('resolves the default model of the configured provider', async () => {
    registry = await createRegistry();

    expect(registry.languageModel()).toBe(
      `model:anthropic:${DEFAULT_MODELS[AiProvider.Anthropic]}`,
    );
    expect(createAnthropic).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });

  it('uses the configured provider and model override', async () => {
    aiConfig = {
      provider: 'openai',
      model: 'gpt-5.2-mini',
      openaiApiKey: 'openai-key',
    };
    registry = await createRegistry();

    expect(registry.languageModel()).toBe('model:openai:gpt-5.2-mini');
    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'openai-key' });
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: undefined,
    });
  });

  it('treats an empty AI_MODEL as unset', async () => {
    // Coolify та інші панелі віддають незадані змінні порожнім рядком.
    aiConfig = { provider: 'anthropic', model: '', anthropicApiKey: 'key' };
    registry = await createRegistry();

    expect(registry.languageModel()).toBe(
      `model:anthropic:${DEFAULT_MODELS[AiProvider.Anthropic]}`,
    );
  });

  it('lets a task override the model of the configured provider', async () => {
    registry = await createRegistry();

    expect(registry.languageModel('claude-haiku-4-5')).toBe(
      'model:anthropic:claude-haiku-4-5',
    );
  });

  it('routes a full provider:model address to that provider', async () => {
    aiConfig = {
      provider: 'anthropic',
      anthropicApiKey: 'key',
      openaiApiKey: 'openai-key',
    };
    registry = await createRegistry();

    expect(registry.languageModel('openai:gpt-5.1')).toBe(
      'model:openai:gpt-5.1',
    );
  });

  it('falls back to the default model of an address without one', async () => {
    aiConfig = {
      provider: 'anthropic',
      anthropicApiKey: 'key',
      googleApiKey: 'g',
    };
    registry = await createRegistry();

    expect(registry.languageModel('google:')).toBe(
      `model:google:${DEFAULT_MODELS[AiProvider.Google]}`,
    );
  });

  it('rejects an address with an unknown provider prefix', async () => {
    registry = await createRegistry();

    // Інакше SDK пішов би за id `anthropic:mistral:large` і повернув 404,
    // який нічим не натякає на помилку конфігурації.
    expect(() => registry.languageModel('mistral:large')).toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws 503 when the addressed provider has no api key', async () => {
    aiConfig = { provider: 'google' };
    registry = await createRegistry();

    expect(() => registry.languageModel()).toThrow(ServiceUnavailableException);
    expect(createProviderRegistry).not.toHaveBeenCalled();
  });

  it('builds the provider registry and reads the keys once', async () => {
    registry = await createRegistry();

    registry.languageModel();
    registry.languageModel();

    expect(createProviderRegistry).toHaveBeenCalledTimes(1);
    // Конфіг статичний після старту — ключі не перечитуються на кожен запит.
    expect(
      configGet.mock.calls.filter(([key]) => key === 'ai.anthropicApiKey'),
    ).toHaveLength(1);
  });
});
