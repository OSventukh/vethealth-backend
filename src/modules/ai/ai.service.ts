import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, jsonSchema, LanguageModel } from 'ai';
import { AiProvider, AllConfigType } from '@/config/config.type';
import { GenerateSeoMetadataDto } from './dto/generate-seo-metadata.dto';

export type SeoMetadataResult = {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
};

// Провайдер обирається через AI_PROVIDER, конкретна модель — через AI_MODEL
// (інакше — дефолт нижче). Ключі — окремі змінні на кожного провайдера.
const DEFAULT_MODELS: Record<AiProvider, string> = {
  [AiProvider.Anthropic]: 'claude-opus-5',
  [AiProvider.OpenAI]: 'gpt-5.1',
  [AiProvider.Google]: 'gemini-2.5-flash',
};

// Обмежуємо вхід: для мета-полів достатньо початку статті, а це тримає
// вартість і латентність передбачуваними незалежно від довжини контенту.
const MAX_INPUT_CHARS = 12000;

// Провайдер, що завис, не має тримати запит вічно — фронтенд чекає
// відповідь синхронно, тож обриваємо генерацію і віддаємо 502.
const GENERATION_TIMEOUT_MS = 30000;

const SEO_FIELDS = [
  'metaTitle',
  'metaDescription',
  'metaKeywords',
  'ogTitle',
  'ogDescription',
] as const;

// Схема лише скеровує генерацію — без validate SDK не перевіряє відповідь
// у рантаймі. Перевіряємо форму (всі поля — непорожні рядки) і тримаємо
// значення; довжини навмисно не валідуємо жорстко (моделі не рахують
// символи надійно, а результат все одно ревʼюїть людина у формі).
export function validateSeoMetadata(
  value: unknown,
):
  | { success: true; value: SeoMetadataResult }
  | { success: false; error: Error } {
  if (typeof value !== 'object' || value === null) {
    return { success: false, error: new Error('AI response is not an object') };
  }
  const record = value as Record<string, unknown>;
  const result = {} as SeoMetadataResult;
  for (const field of SEO_FIELDS) {
    const fieldValue = record[field];
    if (typeof fieldValue !== 'string' || !fieldValue.trim()) {
      return {
        success: false,
        error: new Error(`AI response field "${field}" is missing or empty`),
      };
    }
    result[field] = fieldValue.trim();
  }
  return { success: true, value: result };
}

const SEO_METADATA_SCHEMA = jsonSchema<SeoMetadataResult>(
  {
    type: 'object',
    additionalProperties: false,
    required: [
      'metaTitle',
      'metaDescription',
      'metaKeywords',
      'ogTitle',
      'ogDescription',
    ],
    properties: {
      metaTitle: {
        type: 'string',
        description:
          'SEO-заголовок 40–60 символів українською, з головним пошуковим запитом, без назви сайту',
      },
      metaDescription: {
        type: 'string',
        description:
          'Мета-опис 120–160 символів українською: конкретний, з ключовим запитом і користю для читача',
      },
      metaKeywords: {
        type: 'string',
        description: '4–8 ключових фраз українською через кому',
      },
      ogTitle: {
        type: 'string',
        description:
          'Заголовок для соцмереж до 60 символів, може бути трохи емоційнішим за metaTitle',
      },
      ogDescription: {
        type: 'string',
        description: 'Опис для соцмереж до 200 символів',
      },
    },
  },
  { validate: validateSeoMetadata },
);

const SYSTEM_PROMPT = `Ти — SEO-редактор українського ветеринарного сайту VetHealth (vethealth.com.ua) з довідковими статтями про здоровʼя тварин, їх лікування, догляд і ветеринарні препарати.
На основі заголовка і тексту згенеруй SEO-мета-поля українською мовою.
Вимоги:
- metaTitle: 40–60 символів, містить головний пошуковий запит, без назви сайту і без лапок.
- metaDescription: 120–160 символів, конкретний і корисний, з ключовим запитом; без клікбейту і загальних фраз.
- metaKeywords: 4–8 ключових фраз через кому, у називному відмінку, від найважливішої до найменш важливої.
- ogTitle: до 60 символів, для соцмереж.
- ogDescription: до 200 символів, для соцмереж.
Пиши природною українською, без канцеляризмів і без вигаданих фактів — спирайся лише на наданий текст.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async generateSeoMetadata(
    dto: GenerateSeoMetadataDto,
  ): Promise<SeoMetadataResult> {
    const model = this.resolveModel();

    const text =
      dto.text.length > MAX_INPUT_CHARS
        ? `${dto.text.slice(0, MAX_INPUT_CHARS)}…`
        : dto.text;
    const kind = dto.entityType === 'page' ? 'сторінки' : 'статті';
    const topics = dto.topics?.length
      ? `\nРозділи: ${dto.topics.join(', ')}`
      : '';

    try {
      const { object } = await generateObject({
        model,
        schema: SEO_METADATA_SCHEMA,
        system: SYSTEM_PROMPT,
        prompt: `Заголовок ${kind}: ${dto.title}${topics}\n\nТекст ${kind}:\n${text}`,
        maxOutputTokens: 2000,
        abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      });
      return object;
    } catch (error) {
      this.logger.error(
        `SEO metadata generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadGatewayException('AI generation failed');
    }
  }

  private resolveModel(): LanguageModel {
    const provider = this.configService.getOrThrow('ai.provider', {
      infer: true,
    });
    const model =
      this.configService.get('ai.model', { infer: true }) ||
      DEFAULT_MODELS[provider];

    switch (provider) {
      case AiProvider.OpenAI: {
        const apiKey = this.configService.get('ai.openaiApiKey', {
          infer: true,
        });
        if (!apiKey) {
          throw new ServiceUnavailableException(
            'AI provider is not configured',
          );
        }
        return createOpenAI({ apiKey })(model);
      }
      case AiProvider.Google: {
        const apiKey = this.configService.get('ai.googleApiKey', {
          infer: true,
        });
        if (!apiKey) {
          throw new ServiceUnavailableException(
            'AI provider is not configured',
          );
        }
        return createGoogleGenerativeAI({ apiKey })(model);
      }
      default: {
        const apiKey = this.configService.get('ai.anthropicApiKey', {
          infer: true,
        });
        if (!apiKey) {
          throw new ServiceUnavailableException(
            'AI provider is not configured',
          );
        }
        return createAnthropic({ apiKey })(model);
      }
    }
  }
}
