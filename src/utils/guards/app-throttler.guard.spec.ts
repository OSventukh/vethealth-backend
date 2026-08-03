import { AppThrottlerGuard } from './app-throttler.guard';

// getTracker не використовує стан guard'а, тож інстанс без залежностей достатній.
const guard = new AppThrottlerGuard(
  { throttlers: [] },
  undefined as never,
  undefined as never,
);
const getTracker = (req: Record<string, unknown>): Promise<string> =>
  (
    guard as unknown as {
      getTracker: (req: Record<string, unknown>) => Promise<string>;
    }
  ).getTracker(req);

describe('AppThrottlerGuard', () => {
  it('tracks authenticated requests by token hash, not ip', async () => {
    const request = {
      headers: { authorization: 'Bearer token-a' },
      ip: '10.0.0.1',
    };

    const tracker = await getTracker(request);

    expect(tracker).not.toBe('10.0.0.1');
    expect(tracker).toMatch(/^[a-f0-9]{64}$/);
    // той самий токен з іншої IP → той самий бакет
    await expect(
      getTracker({
        headers: { authorization: 'Bearer token-a' },
        ip: '10.0.0.2',
      }),
    ).resolves.toBe(tracker);
    // інший токен з тієї ж IP → інший бакет (редактори не діляться лімітом)
    await expect(
      getTracker({
        headers: { authorization: 'Bearer token-b' },
        ip: '10.0.0.1',
      }),
    ).resolves.not.toBe(tracker);
  });

  it('falls back to ip for anonymous requests', async () => {
    await expect(getTracker({ headers: {}, ip: '10.0.0.1' })).resolves.toBe(
      '10.0.0.1',
    );
    // за наявності X-Forwarded-For (trust proxy) — перша адреса з ланцюжка
    await expect(
      getTracker({ headers: {}, ip: '172.17.0.1', ips: ['203.0.113.5'] }),
    ).resolves.toBe('203.0.113.5');
  });
});
