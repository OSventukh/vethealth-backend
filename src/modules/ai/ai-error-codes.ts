/**
 * Стабільні `errorCode` у тілі помилок AI-ендпоінтів (Nest 12
 * `HttpExceptionOptions.errorCode`). Це контракт із фронтендом: статус
 * каже «що робити» (503 — конфіг, 429 — зачекати…), а код уточнює причину,
 * тож клієнт не мусить розбирати рядок `message`. 429 від нашого власного
 * `@Throttle` коду не має — так його й відрізняють від ліміту провайдера.
 */
export const AI_ERROR_CODES = {
  /** 503: ключа потрібного провайдера немає або провайдер невідомий. */
  NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
  /** 503: провайдер відхилив ключ (401/403). */
  KEY_REJECTED: 'AI_KEY_REJECTED',
  /** 429: ліміт провайдера; поруч заголовок `Retry-After`, якщо відомий. */
  RATE_LIMITED: 'AI_RATE_LIMITED',
  /** 502: провайдер відповів помилкою. */
  PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  /** 502: модель не влучила в схему відповіді. */
  INVALID_OUTPUT: 'AI_INVALID_OUTPUT',
  /** 502: будь-яка інша непередбачена помилка генерації. */
  GENERATION_FAILED: 'AI_GENERATION_FAILED',
  /** 504: генерація не вклалася в таймаут. */
  TIMEOUT: 'AI_TIMEOUT',
} as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];
