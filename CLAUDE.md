# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> The monorepo-root `../CLAUDE.md` is the primary guide and is auto-loaded when working here.
> It already covers the full backend architecture (modules, config namespaces, the two TypeORM
> DataSources, global pipeline, auth, file-storage factory, mail, Coolify deployment). This file
> only records backend-specific details and gotchas not captured there — don't duplicate the root.

## Commands

This project uses **pnpm** (the README's second "## Test" block showing `npm run …` is stale —
both work, but prefer pnpm). Husky + lint-staged run on commit.

```bash
docker compose --profile dev up -d   # MySQL + Mailpit only (app runs natively on host)
pnpm migration:run                   # apply migrations — run before first start
pnpm start:dev                       # NestJS watch mode → http://localhost:5000 (Swagger at /api)
pnpm seed:run                        # seed roles/statuses + admin user from ADMIN_* env
pnpm test                            # jest unit tests (*.spec.ts colocated with source)
pnpm test -- files.service           # single unit test file by name pattern
pnpm test:e2e                        # e2e (test/*.e2e-spec.ts, --maxWorkers=1, uses sqlite3)
pnpm type-check                      # tsc --noEmit
pnpm lint                            # oxlint --fix   (ESLint/Prettier/Biome removed)
pnpm format                          # oxfmt          (Prettier-compatible; 0.x beta — pin version)
```

**oxlint config (`.oxlintrc.json`) — NestJS rule overrides, do not remove:**
`typescript/consistent-type-imports: off` (else DI imports become `import type` → breaks
`emitDecoratorMetadata`), `typescript/parameter-properties: off` (allows `constructor(private x)`
DI), `new-cap: off` (misfires on decorator calls), `typescript/no-extraneous-class` with
`allowWithDecorator` (empty `@Module` classes), `no-console: error` + `no-explicit-any: off`
(old ESLint policy), `no-await-in-loop: off` (intentional sequential I/O in `files.service.ts`).
Categories: `correctness`/`suspicious`/`perf` only — `style`/`pedantic` are too noisy for NestJS.
`ignorePatterns` excludes `migrations/`. oxfmt (`.oxfmtrc.json`) additionally skips `src/i18n` and
`src/mail/mail-templates`. Prefix intentionally-unused params (Passport/multer/pipe/validator
signatures) with `_` — oxlint ignores them. Oxc parses param decorators natively (no special flag).

Migrations (the `typeorm` script wires `env-cmd` to load `.env` and `tsconfig-paths`):
```bash
pnpm migration:generate src/database/migrations/<Name>   # diff entities → migration
pnpm migration:create   src/database/migrations/<Name>   # empty migration
pnpm migration:revert
```
Note: `migration:generate`/`run`/`revert` pass `--dataSource=src/database/data-source.ts` (the
CLI DataSource that reads `process.env`); `migration:create` does not need it. Entities are
glob-discovered (`**/*.entity.ts`) and `DATABASE_SYNCHRONIZE` must stay `false`.

**Fresh dev DB gotcha:** the first migration (`*-Baseline.ts`) is **empty** — the base schema was
originally created via synchronize, and the committed migrations only carry the increments after
that point (they `ALTER` tables that no migration creates). So `pnpm migration:run` against an
**empty** MySQL will fail (it `ALTER`s not-yet-existing tables). To bootstrap a fresh local DB,
materialise the schema from entities instead of running migrations:
```bash
docker compose --profile dev up -d                                          # start mysql:8 + mailpit
pnpm exec env-cmd ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js \
  schema:sync -d src/database/data-source.ts                                 # create schema from entities
pnpm seed:run                                                               # roles/statuses + ADMIN_* user
```
This does **not** populate the `migrations` table, so don't run `migration:run` on a
schema:sync'd dev DB. The alternative (for a prod-identical dev) is to import a `mysqldump` of prod
(including its `migrations` table).

## Auth/authz hardening (in progress, 2026-06/07)

A security pass over auth/authz is underway; new code must follow the target model:
- **Deny by default**: `AuthDataGuard` (`src/modules/auth/guards/auth-data.guard.ts`) now throws
  `UnauthorizedException` when there's no valid JWT, unless the handler/class is marked
  `@Public()` (`src/roles/decorators/public.decorator.ts`, checked via `Reflector`). Public read
  endpoints get an explicit `@Public()`; don't leave endpoints implicitly open.
- `PATCH /auth/change-password` requires auth + `oldPassword`, takes the user id from
  `request.user` (never the body), and soft-deletes the user's *other* sessions.
- **Target RBAC policy** (roles: SuperAdmin=1, Admin=2, Moder=3, Writer=4; "Admin+" = 1|2):
  posts — create by any authed user, edit/delete by owner or Admin+; pages/categories/topics —
  mutations Admin+ only, reads public (topics `POST` with `@Roles(1,2)` is the model to copy);
  users — everything Admin+ except a user editing their own profile (never own role/status).
  Not all controllers enforce this yet — when touching one, bring it in line rather than copying
  its current guards.

## Pages = block documents (2026-07)

`pages.content` (MEDIUMTEXT) зберігає документ фронтендового конструктора
`{version: 1, blocks: [{id, type, data}]}` — **не** чистий Lexical editor-state (той формат
лишився в `posts.content` і всередині `richtext`-блоків). Міграція
`1784413708920-PagesBuilderContent` загорнула легасі-рядки в один `richtext`-блок (down —
розгортає лише такі одноблочні документи). Бекенд контент не валідує (як і раніше — `@IsString`),
рендеринг/парсинг повністю на фронтенді. `PageQueryDto.include` дозволяє `metadata`; фронтендовий
редактор шле `metadata` без id у PATCH — каскад створює новий metadata-рядок (старий осиротіє,
це відома особливість, як у постів).

## AI: генерація SEO-мета (2026-08)

`src/modules/ai` — `POST /ai/seo-metadata` (будь-який автентифікований користувач; `@Throttle`
10 req/хв) генерує metaTitle/metaDescription/metaKeywords/ogTitle/ogDescription з тексту
статті/сторінки через **Vercel AI SDK** (`generateObject` + zod-схема → гарантовано валідний
JSON). Провайдер перемикається конфігом (namespace `ai`): `AI_PROVIDER` = `anthropic` (дефолт) |
`openai` | `google`, модель — `AI_MODEL` (дефолти: `claude-opus-5` / `gpt-5.1` /
`gemini-2.5-flash`), ключі — `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` /
`GOOGLE_GENERATIVE_AI_API_KEY`.

**Структура модуля (рефакторинг 2026-08-15).** Три шари, кожен зі своєю відповідальністю:
- `ai-model.registry.ts` — `AiModelRegistry` поверх `createProviderRegistry`: усі три провайдери
  реєструються під префіксами, модель адресується рядком `provider:model`. Додати провайдера =
  один рядок у `buildRegistry`. Реєстр будується один раз (лениво), ключі теж читаються один раз
  (конфіг статичний після старту); без ключа потрібного провайдера — **503** ще до виклику SDK.
  `languageModel()` (як і `AI_MODEL`, і `AiTask.model`) приймає **або** назву моделі поточного
  провайдера (`claude-haiku-4-5`), **або** повну адресу `provider:model` (`openai:gpt-5.1`) — тоді
  задача йде до іншого провайдера, ніж `AI_PROVIDER`. Невідомий префікс — одразу 503, бо інакше
  SDK пішов би за неіснуючим id і повернув 404, що ніяк не натякає на помилку конфігурації.
- `tasks/*.task.ts` — декларативний опис задачі (`AiTask`): zod-схема відповіді, системний промт,
  `buildPrompt`, `maxOutputTokens`, опційний `model`. **Нова AI-фіча = новий файл тут** +
  метод-обгортка в `AiService`; логіку виклику дублювати не треба.
- `ai.service.ts` — єдиний `run(task, input)`: модель із реєстру, `generateObject`, таймаут,
  ретраї та маппінг помилок SDK у HTTP-статуси.

Нюанси:
- `ai` і `@ai-sdk/*` — **ESM-only**; працюють у CJS-збірці через `require(esm)` (Node ≥22.12 —
  Docker-образ `node:22` підходить). Не даунгрейдити Node нижче 22.12.
- У jest ці пакети **мокати фабриками** (`jest.mock('ai', …)`) — див. `ai.service.spec.ts`;
  реальний ESM-код jest не розпарсить. Спец сервісу мокає ще й `@ai-sdk/*`: вони приїжджають
  транзитивно разом із класом `AiModelRegistry` (DI-токеном), хоч і не викликаються.
- Вхідний текст обрізається до 12k символів (вартість/латентність) — це робить `buildPrompt`
  задачі, не сервіс. Промт вимагає українську і довжини 40–60/120–160 символів у полях.
- Відповідь моделі валідує **сам SDK** zod-схемою задачі (`seoMetadataSchema`: 5 непорожніх
  рядків, `.trim()` застосовується до значень; зайві поля відкидаються). Схема ж їде провайдеру
  як JSON Schema — з `required`, `additionalProperties: false` і описами полів. Довжини полів
  навмисно НЕ валідуються жорстко — моделі не рахують символи надійно, жорсткий min/max давав би
  флейкові 502; довжини тримає промт + ревʼю людиною у формі.
- Генерація має 30-с таймаут (`abortSignal: AbortSignal.timeout`); `maxRetries: 1`, бо ретраї
  SDK ділять той самий бюджет таймауту (сигнал один на всі спроби).
- **Маппінг помилок** (`AiService.toHttpException` → `classify`, через `isInstance` класів SDK;
  `RetryError` спершу розгортається до `lastError`). Статуси розведені за тим, **що клієнт має
  показати редактору**, а не за типом винятку:
  - **503** — тільки проблеми конфігурації: немає ключа (кидає реєстр) або провайдер його
    відхилив (`APICallError` 401/403). Фронтенд на 503 каже «додайте API-ключ у env бекенда»,
    тож тимчасові збої сюди пхати **не можна** — редактор побачить неправдиву пораду.
  - **429** — ліміт провайдера (`APICallError` 429) + заголовок `Retry-After`, узятий із
    `responseHeaders` (`retry-after` / `retry-after-ms`). Сам заголовок дописує контролер:
    фільтр винятків Nest пише лише статус і тіло, тож `AiProviderException` несе
    `retryAfterSeconds` до контролера. Не плутати з нашим власним `@Throttle` (10 req/хв) —
    статус той самий, і порада редактору («зачекайте хвилину») теж.
  - **502** — провайдер відповів помилкою (будь-який інший `APICallError`, включно з 5xx) або
    модель не влучила в схему (`NoObjectGeneratedError`).
  - **504** — генерація не вклалася в 30 с (таймаут/abort).
  `isAbortError` обходить `cause` і `AggregateError.errors` на глибину 3 — обгортка провайдера
  не зобовʼязана бути `Error` (undici кидає `AggregateError` на таймаутах зʼєднання).
  При 502 через схему в лог іде **вкладена причина** (`TypeValidationError` називає поле, що не
  зійшлося) + сира відповідь моделі (перші 300 символів). `finishReason` тут **не логуємо**: SDK
  не заповнює його на `NoObjectGeneratedError` з `generateObject` — він завжди `undefined`.
  Оригінальна помилка їде у `cause` винятку, назовні — лише санітизоване повідомлення.
- **Статуси — це контракт із фронтендом.** `frontend/src/app/(dashboard)/admin/actions/`
  `generate-seo.action.ts` (гілка `main`; у `dev` цього файлу ще немає) мапить статус на
  українське повідомлення редактору: 429 / 502 / 503, решта — загальний fallback. Міняючи
  маппінг тут, міняй і той `STATUS_MESSAGES`. **Відкритий хвіст:** для **504** запису там ще
  немає — редактор бачить загальне «Не вдалося згенерувати мета-поля» замість «провайдер довго
  не відповідає».
- Rate limit трекається **за sha256-хешем bearer-токена** (`AppThrottlerGuard`,
  `src/utils/guards/`, замінює `ThrottlerGuard` в `app.module.ts`): усі запити з адмінки
  приходять через Next server actions з однієї IP frontend-контейнера, тож IP-трекер
  склеював би всіх редакторів в один бакет. Анонімні запити — за IP, як раніше.

## Backend-specific notes

- **Path alias** `@/*` → `./src/*` (tsconfig + jest `moduleNameMapper`). Use it in imports — it is
  now the **only** alias style; the handful of baseUrl-relative `from 'src/…'` imports were
  converted (2026-08-16). `baseUrl` is deliberately **absent** (TS 6 deprecates it, TS 7 drops it):
  `paths` values are therefore repo-relative (`./src/*`). All three resolvers were verified without
  it — `tsc`, the Nest CLI's alias rewriting in `nest build` (dist ships relative `require`s, no
  `@/` survives), and `ts-node -r tsconfig-paths/register` (migrations/seeds). Don't re-add
  `baseUrl`, and don't drop it without also converting every non-relative import — the combination
  `baseUrl` gone + `paths: ["src/*"]` fails with **TS5090** and breaks `nest build` outright.
- **Bootstrap** (`src/main.ts`): CORS is locked to `app.frontendDomain` with `credentials: true`;
  port comes from `app.port` (5000). Validation stacks the standard `ValidationPipe`
  (`transform`/`whitelist`/`forbidNonWhitelisted`) **with** `nestjs-i18n`'s `I18nValidationPipe`
  + `I18nValidationExceptionFilter` for translated errors. Despite the `API_PREFIX` env var,
  no global prefix is set — routes are served at root; only Swagger lives at `/api`.
- **Throttler** is registered globally in `app.module.ts` as an `APP_GUARD`; local uploads are
  served via `ServeStaticModule` at `/uploads/`.
- **Database URL**: config accepts either `DATABASE_URL` or discrete `DATABASE_*` vars (see
  `.env.example`). Seeds live in `src/database/seeds` (role/status/user sub-seeders run via
  `run-seed.ts`).
- **File storage** driver is chosen by `FILE_STORAGE_DRIVER` (`local | s3 | r2 | seaweed`) in
  `src/modules/files/storage/file-storage.factory.ts`. Non-local drivers require S3 creds plus one
  of `FILE_S3_PUBLIC_URL` / `FILE_CDN_BASE_URL`.
- **Uploads → R2 migration scripts**: one-off `scripts/migrate-uploads-to-r2*` move existing local
  uploads to R2/S3 (physical files only). **Then** run `scripts/migrate-db-refs-to-r2.js` to rewrite the DB
  references so R2 is used end-to-end: it strips `/uploads/` from `files.path` (→ bare R2 key, which
  `FileEntity.updatePath()` turns into a public URL) and rewrites embedded upload URLs in
  `posts.content` (the Lexical editor stores `relativePath`, which in local mode resolves to an
  **absolute** `<backendDomain>/uploads/…` URL inside the JSON), `posts.featuredImageUrl`,
  `pages.content`, and `metadata.{ogImage,twitterImage,canonicalUrl,structuredData}` to the R2 public
  base. URL rewriting is **domain-agnostic** (regex matches any `<scheme>://<host>/uploads/…`, so a
  stale authoring domain still migrates) and leaves non-`/uploads/` external URLs alone. Dry-run by
  default (prints per-URL before→after diffs); `--execute` applies; idempotent.
- **`.env.example`** is a generic placeholder template — keep it that way; real values go in `.env`.
- **`docker-compose.yml` передає env у prod-контейнер явним allowlist'ом** (`app.environment`) —
  нова env-змінна, додана лише в config namespace / `.env.example`, у прод **не потрапить**,
  поки її не додано і в цей список (саме так AI-ключі спершу лишилися поза контейнером).
