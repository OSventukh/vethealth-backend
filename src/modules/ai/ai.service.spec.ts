import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  APICallError,
  generateObject,
  NoObjectGeneratedError,
  RetryError,
} from 'ai';
import { AiModelRegistry } from './ai-model.registry';
import { AiProviderException, AiService } from './ai.service';
import { seoMetadataSchema, seoMetadataTask } from './tasks/seo-metadata.task';

// `ai` і `@ai-sdk/*` — ESM-only, jest їх не розпарсить: підміняємо
// фабриками. Провайдери тут не викликаються — вони приїжджають лише
// транзитивно, разом із класом AiModelRegistry (DI-токеном).
// Класи помилок відтворюють контракт SDK (`isInstance` + поля), бо саме
// на них тримається маппінг у HTTP-статуси.
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: jest.fn() }));

jest.mock('ai', () => {
  class MockAPICallError extends Error {
    statusCode?: number;
    responseHeaders?: Record<string, string>;
    isRetryable: boolean;

    constructor({
      message,
      statusCode,
      responseHeaders,
      isRetryable,
    }: {
      message: string;
      statusCode?: number;
      responseHeaders?: Record<string, string>;
      isRetryable?: boolean;
    }) {
      super(message);
      this.statusCode = statusCode;
      this.responseHeaders = responseHeaders;
      this.isRetryable =
        isRetryable ??
        (statusCode != null &&
          (statusCode === 408 ||
            statusCode === 409 ||
            statusCode === 429 ||
            statusCode >= 500));
    }

    static isInstance(error: unknown) {
      return error instanceof MockAPICallError;
    }
  }

  class MockNoObjectGeneratedError extends Error {
    text?: string;
    // `cause` тут — вкладена TypeValidationError: у SDK саме вона пояснює,
    // яке поле не зійшлося (`finishReason` лишається порожнім).
    cause?: unknown;

    constructor({ text, cause }: { text?: string; cause?: unknown }) {
      super('No object generated');
      this.text = text;
      this.cause = cause;
    }

    static isInstance(error: unknown) {
      return error instanceof MockNoObjectGeneratedError;
    }
  }

  // SDK не приймає lastError ззовні — він завжди останній із `errors`.
  class MockRetryError extends Error {
    errors: unknown[];
    lastError: unknown;

    constructor({ message, errors }: { message: string; errors: unknown[] }) {
      super(message);
      this.errors = errors;
      this.lastError = errors[errors.length - 1];
    }

    static isInstance(error: unknown) {
      return error instanceof MockRetryError;
    }
  }

  return {
    generateObject: jest.fn(),
    APICallError: MockAPICallError,
    NoObjectGeneratedError: MockNoObjectGeneratedError,
    RetryError: MockRetryError,
  };
});

const generateObjectMock = generateObject as unknown as jest.Mock;

const RESULT = {
  metaTitle: 'Тестовий meta title',
  metaDescription: 'Тестовий meta description',
  metaKeywords: 'котики, песики',
  ogTitle: 'OG title',
  ogDescription: 'OG description',
};

const apiCallError = (
  statusCode: number,
  responseHeaders?: Record<string, string>,
) =>
  new APICallError({
    message: `provider responded ${statusCode}`,
    url: 'https://provider.test/v1',
    requestBodyValues: {},
    statusCode,
    responseHeaders,
  });

describe('AiService', () => {
  let service: AiService;
  let languageModel: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    languageModel = jest.fn(() => 'language-model');
    generateObjectMock.mockResolvedValue({ object: RESULT });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: AiModelRegistry, useValue: { languageModel } },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  // Помилки перекладені в HTTP-статуси, тож перевіряємо саме статус —
  // це той контракт, за яким діє адмінка.
  const expectFailure = async (): Promise<AiProviderException> => {
    try {
      await service.generateSeoMetadata({ title: 'Титул', text: 'Текст' });
    } catch (error) {
      return error as AiProviderException;
    }

    throw new Error('expected the generation to fail');
  };

  it('runs the seo task against the model from the registry', async () => {
    const result = await service.generateSeoMetadata({
      title: 'Отруєння у собак',
      text: 'Текст статті про отруєння.',
      topics: ['Собаки'],
    });

    expect(result).toEqual(RESULT);

    const callArgs = generateObjectMock.mock.calls[0][0];
    expect(callArgs.model).toBe('language-model');
    expect(callArgs.schema).toBe(seoMetadataSchema);
    expect(callArgs.schemaName).toBe('seo-metadata');
    // Системний промт тримає мову і довжини полів — без нього схема все
    // одно зійдеться, тож ловимо його втрату тут.
    expect(callArgs.system).toBe(seoMetadataTask.system);
    expect(callArgs.maxOutputTokens).toBe(seoMetadataTask.maxOutputTokens);
    expect(callArgs.prompt).toContain('Отруєння у собак');
    expect(callArgs.prompt).toContain('Текст статті про отруєння.');
    expect(callArgs.prompt).toContain('Собаки');
    // Захист від провайдера, що завис: генерація завжди з таймаутом,
    // а ретраї SDK ділять той самий бюджет.
    expect(callArgs.abortSignal).toBeInstanceOf(AbortSignal);
    expect(callArgs.maxRetries).toBe(1);
  });

  it('propagates the 503 raised when the provider has no api key', async () => {
    languageModel.mockImplementation(() => {
      throw new ServiceUnavailableException('AI provider is not configured');
    });

    await expect(
      service.generateSeoMetadata({ title: 'Титул', text: 'Текст' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it('maps a timed-out generation to 504', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    generateObjectMock.mockRejectedValue(timeout);

    expect((await expectFailure()).getStatus()).toBe(
      HttpStatus.GATEWAY_TIMEOUT,
    );
  });

  it('detects an abort wrapped in a non-Error cause', async () => {
    // Провайдери інколи загортають DOMException у власний обʼєкт — на
    // ньому обхід cause не має зупинятися.
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    generateObjectMock.mockRejectedValue({
      message: 'request failed',
      cause: abort,
    });

    expect((await expectFailure()).getStatus()).toBe(
      HttpStatus.GATEWAY_TIMEOUT,
    );
  });

  it('detects an abort collected into an AggregateError', async () => {
    const abort = new Error('The operation was aborted due to timeout');
    abort.name = 'TimeoutError';
    generateObjectMock.mockRejectedValue(
      new AggregateError([new Error('ECONNRESET'), abort], 'connect failed'),
    );

    expect((await expectFailure()).getStatus()).toBe(
      HttpStatus.GATEWAY_TIMEOUT,
    );
  });

  it('maps a rejected api key to 503', async () => {
    generateObjectMock.mockRejectedValue(apiCallError(401));

    expect((await expectFailure()).getStatus()).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('unwraps RetryError and maps a rate-limited provider to 429', async () => {
    // 503 тут означав би «ШІ не налаштовано» — у фронтенді це повідомлення
    // про відсутній API-ключ, тож ліміт провайдера має лишатися 429.
    generateObjectMock.mockRejectedValue(
      new RetryError({
        message: 'Failed after 2 attempts',
        reason: 'maxRetriesExceeded',
        errors: [apiCallError(500), apiCallError(429, { 'retry-after': '12' })],
      } as never),
    );

    const error = await expectFailure();
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.retryAfterSeconds).toBe(12);
  });

  it('reads the retry delay from retry-after-ms as well', async () => {
    generateObjectMock.mockRejectedValue(
      apiCallError(429, { 'retry-after-ms': '2500' }),
    );

    expect((await expectFailure()).retryAfterSeconds).toBe(3);
  });

  it('maps a failing provider to 502 and keeps the original error as cause', async () => {
    const providerError = apiCallError(500);
    generateObjectMock.mockRejectedValue(providerError);

    const error = await expectFailure();
    expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    expect(error.retryAfterSeconds).toBeUndefined();
    expect(error.cause).toBe(providerError);
  });

  it('maps a non-retryable provider error to 502', async () => {
    generateObjectMock.mockRejectedValue(apiCallError(400));

    expect((await expectFailure()).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
  });

  it('maps a response that does not match the schema to 502', async () => {
    generateObjectMock.mockRejectedValue(
      new NoObjectGeneratedError({
        text: '{"metaTitle": ',
        cause: new Error('Type validation failed: metaTitle is required'),
      } as never),
    );

    expect((await expectFailure()).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
  });

  it('maps unknown failures to 502', async () => {
    generateObjectMock.mockRejectedValue(new Error('upstream boom'));

    expect((await expectFailure()).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
  });
});
