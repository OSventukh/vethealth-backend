import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  APICallError,
  generateObject,
  NoObjectGeneratedError,
  RetryError,
} from 'ai';
import { AiModelRegistry } from './ai-model.registry';
import { GenerateSeoMetadataDto } from './dto/generate-seo-metadata.dto';
import { AiTask } from './tasks/ai-task';
import { SeoMetadataResult, seoMetadataTask } from './tasks/seo-metadata.task';

// Провайдер, що завис, не має тримати запит вічно — фронтенд чекає
// відповідь синхронно, тож обриваємо генерацію і віддаємо 504.
const GENERATION_TIMEOUT_MS = 30000;

// Ретраї SDK ділять той самий бюджет таймауту (abortSignal один на всі
// спроби), тож лишаємо одну повторну спробу замість дефолтних двох.
const MAX_RETRIES = 1;

// Скільки сирої відповіді моделі писати в лог, коли вона не лягла в схему.
const INVALID_OUTPUT_LOG_CHARS = 300;

// Глибина розгортання cause/AggregateError у пошуках причини скасування.
const MAX_CAUSE_DEPTH = 3;

/**
 * Помилка виклику AI-провайдера, вже перекладена в HTTP-статус.
 * `retryAfterSeconds` — те, що провайдер попросив у заголовках 429;
 * контролер віддає це клієнту як `Retry-After`.
 */
export class AiProviderException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    readonly retryAfterSeconds?: number,
    options?: { cause?: unknown },
  ) {
    super(message, status, options);
  }
}

interface AiErrorMapping {
  status: HttpStatus;
  /** Повідомлення клієнту — без внутрішніх деталей провайдера. */
  message: string;
  /** Що саме сталося — лише в лог. */
  detail: string;
  retryAfterSeconds?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly models: AiModelRegistry) {}

  generateSeoMetadata(dto: GenerateSeoMetadataDto): Promise<SeoMetadataResult> {
    return this.run(seoMetadataTask, dto);
  }

  /**
   * Єдина точка виконання AI-задач: модель, таймаут, ретраї та маппінг
   * помилок SDK у HTTP-статуси. Задачі описані декларативно в `tasks/`.
   */
  private async run<INPUT, OUTPUT>(
    task: AiTask<INPUT, OUTPUT>,
    input: INPUT,
  ): Promise<OUTPUT> {
    // Поза try: відсутній ключ — це 503 конфігурації, а не збій генерації.
    const model = this.models.languageModel(task.model);
    const prompt = task.buildPrompt(input);

    try {
      const { object } = await generateObject({
        model,
        // `output` задаємо явно: без нього SDK виводить його з типу схеми,
        // а тут схема — ще не розкритий дженерик задачі.
        output: 'object',
        schema: task.schema,
        schemaName: task.name,
        system: task.system,
        prompt,
        maxOutputTokens: task.maxOutputTokens,
        maxRetries: MAX_RETRIES,
        abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      });

      return object;
    } catch (error) {
      throw this.toHttpException(task.name, error);
    }
  }

  private toHttpException(task: string, error: unknown): HttpException {
    // RetryError ховає справжню причину під собою — розгортаємо до неї.
    const cause = RetryError.isInstance(error) ? error.lastError : error;
    const { status, message, detail, retryAfterSeconds } = classify(cause);

    this.logger.error(`AI task "${task}" failed → ${status}: ${detail}`);

    // Оригінальна помилка їде в `cause`: сам виняток несе лише санітизоване
    // повідомлення, а стек провайдера лишається доступним фільтрам Nest.
    return new AiProviderException(message, status, retryAfterSeconds, {
      cause: error,
    });
  }
}

/**
 * Класифікація помилок SDK. Статуси розведені так, щоб клієнт міг за ними
 * діяти: 503 — «ШІ не налаштовано» (проблема конфігурації на нашому боці),
 * 429 — ліміт провайдера (можна повторити), 502 — провайдер відповів
 * помилково або не влучив у схему, 504 — не відповів за відведений час.
 */
function classify(cause: unknown): AiErrorMapping {
  if (isAbortError(cause)) {
    return {
      status: HttpStatus.GATEWAY_TIMEOUT,
      message: 'AI generation timed out',
      detail: `aborted after ${GENERATION_TIMEOUT_MS}ms`,
    };
  }

  if (APICallError.isInstance(cause)) {
    const detail = `provider responded ${cause.statusCode ?? '?'} — ${cause.message}`;

    // Зіпсований/відкликаний ключ — проблема конфігурації, а не генерації:
    // це той самий 503, що й повністю відсутній ключ.
    if (cause.statusCode === 401 || cause.statusCode === 403) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'AI provider rejected the API key',
        detail,
      };
    }

    if (cause.statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        message: 'AI provider rate limit reached',
        detail,
        retryAfterSeconds: retryAfterSecondsOf(cause),
      };
    }

    return {
      status: HttpStatus.BAD_GATEWAY,
      message: 'AI provider request failed',
      detail,
    };
  }

  if (NoObjectGeneratedError.isInstance(cause)) {
    // `finishReason` тут SDK не заповнює (він лишається undefined навіть
    // при обриві по довжині), тож пояснює лише вкладена причина —
    // TypeValidationError називає поле, що не зійшлося, — плюс сира
    // відповідь моделі.
    const reason =
      cause.cause instanceof Error ? cause.cause.message : 'unknown reason';

    return {
      status: HttpStatus.BAD_GATEWAY,
      message: 'AI generation failed',
      detail:
        `model returned an invalid object (${truncate(reason)}); ` +
        `raw: ${truncate(cause.text) || '<no text>'}`,
    };
  }

  return {
    status: HttpStatus.BAD_GATEWAY,
    message: 'AI generation failed',
    detail: cause instanceof Error ? cause.message : String(cause),
  };
}

/**
 * Провайдер уже сказав, коли можна повторити — SDK склав ці заголовки в
 * `responseHeaders`. HTTP-дату (замість секунд) не розбираємо: усі три
 * провайдери віддають число.
 */
function retryAfterSecondsOf(error: APICallError): number | undefined {
  const headers = error.responseHeaders ?? {};

  const ms = Number(headers['retry-after-ms']);
  if (Number.isFinite(ms) && ms > 0) {
    return Math.ceil(ms / 1000);
  }

  const seconds = Number(headers['retry-after']);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.ceil(seconds)
    : undefined;
}

// AbortSignal.timeout() кидає DOMException TimeoutError, а зовнішнє
// скасування — AbortError. Провайдери інколи загортають їх у cause
// (причому обгортка не завжди Error) або складають в AggregateError —
// undici так робить на таймаутах зʼєднання.
function isAbortError(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== 'object' || depth > MAX_CAUSE_DEPTH) {
    return false;
  }

  const { name, cause, errors } = error as {
    name?: unknown;
    cause?: unknown;
    errors?: unknown;
  };

  if (name === 'TimeoutError' || name === 'AbortError') {
    return true;
  }

  if (
    Array.isArray(errors) &&
    errors.some((nested) => isAbortError(nested, depth + 1))
  ) {
    return true;
  }

  return isAbortError(cause, depth + 1);
}

const truncate = (text: string | undefined) =>
  text && text.length > INVALID_OUTPUT_LOG_CHARS
    ? `${text.slice(0, INVALID_OUTPUT_LOG_CHARS)}…`
    : text;
