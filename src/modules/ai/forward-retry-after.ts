import { Response } from 'express';
import { AiProviderException } from './ai.service';

/**
 * Виконує AI-виклик і, якщо провайдер відповів 429 з бекофом, дописує його
 * у `Retry-After`: фільтр винятків Nest пише лише статус і тіло, тож без
 * цього заголовок загубився б. Response треба брати з
 * `@Res({ passthrough: true })`, щоб звичайна обробка відповіді лишилась.
 */
export async function forwardRetryAfter<T>(
  response: Response,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (
      error instanceof AiProviderException &&
      error.retryAfterSeconds !== undefined
    ) {
      response.setHeader('Retry-After', String(error.retryAfterSeconds));
    }

    throw error;
  }
}
