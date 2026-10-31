#!/bin/sh
# Запуск контейнера: спершу міграції БД, потім застосунок.
# Якщо міграція впала, застосунок не стартує — краще явна помилка в логах
# деплою, ніж код, що працює на старій схемі (`Unknown column ...`).
# Вимкнути: MIGRATIONS_RUN=false (тоді міграції — вручну, `npm run migration:run:prod`).
set -e

if [ "${MIGRATIONS_RUN:-true}" = "true" ]; then
  echo "[entrypoint] Running database migrations..."
  npm run --silent migration:run:prod
else
  echo "[entrypoint] MIGRATIONS_RUN=${MIGRATIONS_RUN}: skipping migrations"
fi

exec node dist/main
