import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Запити з адмінки йдуть через Next.js server actions, тобто всі — з однієї
// IP-адреси frontend-контейнера, і дефолтний IP-трекер склеїв би всіх
// редакторів в один бакет. Тому автентифіковані запити трекаємо за хешем
// bearer-токена (окремий бакет на сесію; request.user тут ще недоступний —
// throttler виконується до auth-guard'а), анонімні — за IP, як і раніше.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const authHeader: unknown = req.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return Promise.resolve(
        createHash('sha256').update(authHeader).digest('hex'),
      );
    }
    return Promise.resolve(req.ips?.length ? req.ips[0] : req.ip);
  }
}
