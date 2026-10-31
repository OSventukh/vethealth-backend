/* oxlint-disable no-console -- CLI-скрипт: результат друкується в консоль. */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { MediaService } from '../media.service';

/**
 * Одноразово дозаповнює розмір, тип і ширину/висоту файлам, завантаженим до
 * медіатеки. Ідемпотентний — повторний запуск чіпає лише те, що лишилось.
 *   dev:  pnpm media:backfill
 *   prod: pnpm media:backfill:prod   (у контейнері, після migration:run:prod)
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const { updated, failed } = await app.get(MediaService).backfillMetadata();
    console.log(`Updated: ${updated}, failed: ${failed.length}`);
    for (const { path, reason } of failed)
      console.log(`  ✗ ${path}: ${reason}`);
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
