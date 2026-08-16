import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createProviderRegistry, LanguageModel } from 'ai';
import { AiProvider, AllConfigType } from '@/config/config.type';

// Провайдер обирається через AI_PROVIDER, конкретна модель — через AI_MODEL
// (інакше — дефолт нижче). Ключі — окремі змінні на кожного провайдера.
export const DEFAULT_MODELS: Record<AiProvider, string> = {
  [AiProvider.Anthropic]: 'claude-opus-5',
  [AiProvider.OpenAI]: 'gpt-5.1',
  [AiProvider.Google]: 'gemini-2.5-flash',
};

type ApiKeys = Record<AiProvider, string | undefined>;

interface ModelAddress {
  provider: AiProvider;
  model: string;
}

const isAiProvider = (value: string): value is AiProvider =>
  (Object.values(AiProvider) as string[]).includes(value);

// Реєстр провайдерів SDK: моделі адресуються рядком `provider:model`, тож
// додати провайдера = один рядок тут. Ключ може бути порожнім — провайдери
// читають його ліниво (лише на виклику), а наявність ми перевіряємо самі.
const buildRegistry = (keys: ApiKeys) =>
  createProviderRegistry({
    [AiProvider.Anthropic]: createAnthropic({
      apiKey: keys[AiProvider.Anthropic],
    }),
    [AiProvider.OpenAI]: createOpenAI({ apiKey: keys[AiProvider.OpenAI] }),
    [AiProvider.Google]: createGoogleGenerativeAI({
      apiKey: keys[AiProvider.Google],
    }),
  });

@Injectable()
export class AiModelRegistry {
  private registry: ReturnType<typeof buildRegistry> | undefined;
  private keys: ApiKeys | undefined;

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  /**
   * Модель для генерації. `modelOverride` (як і AI_MODEL) приймає або назву
   * моделі поточного провайдера (`claude-haiku-4-5`), або повну адресу
   * `provider:model` (`openai:gpt-5.1`) — тоді задача свідомо йде до іншого
   * провайдера. Без ключа потрібного провайдера — 503, а не помилка десь
   * усередині SDK.
   */
  languageModel(modelOverride?: string): LanguageModel {
    const { provider, model } = this.resolveAddress(modelOverride);

    if (!this.apiKeys()[provider]) {
      throw new ServiceUnavailableException(
        `AI provider "${provider}" is not configured`,
      );
    }

    return this.getRegistry().languageModel(`${provider}:${model}`);
  }

  private resolveAddress(modelOverride?: string): ModelAddress {
    const provider = this.configService.getOrThrow('ai.provider', {
      infer: true,
    });

    // `||`, а не `??`: деплой-панелі (Coolify) віддають незадані змінні
    // порожнім рядком — його треба трактувати як «не задано».
    const address =
      modelOverride ||
      this.configService.get('ai.model', { infer: true }) ||
      '';

    const [prefix, ...rest] = address.split(':');
    if (rest.length === 0) {
      return { provider, model: address || DEFAULT_MODELS[provider] };
    }

    // Адреса з префіксом: перевіряємо провайдера тут, інакше SDK піде за
    // неіснуючим id і поверне 404, який не натякне на помилку конфігурації.
    if (!isAiProvider(prefix)) {
      throw new ServiceUnavailableException(
        `Unknown AI provider "${prefix}" in model address "${address}"`,
      );
    }

    const model = rest.join(':');
    return { provider: prefix, model: model || DEFAULT_MODELS[prefix] };
  }

  private getRegistry() {
    // Реєстр — лише набір замикань, але тримаємо один на застосунок.
    this.registry ??= buildRegistry(this.apiKeys());
    return this.registry;
  }

  private apiKeys(): ApiKeys {
    // Конфіг статичний після старту — читаємо ключі один раз, а не на
    // кожен запит (тут три звернення до ConfigService заради одного ключа).
    this.keys ??= {
      [AiProvider.Anthropic]: this.configService.get('ai.anthropicApiKey', {
        infer: true,
      }),
      [AiProvider.OpenAI]: this.configService.get('ai.openaiApiKey', {
        infer: true,
      }),
      [AiProvider.Google]: this.configService.get('ai.googleApiKey', {
        infer: true,
      }),
    };

    return this.keys;
  }
}
