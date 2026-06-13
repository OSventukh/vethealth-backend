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
docker compose --profile dev up -d   # Postgres + Mailpit only (app runs natively on host)
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

## Backend-specific notes

- **Path alias** `@/*` → `src/*` (tsconfig + jest `moduleNameMapper`). Use it in imports.
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
- **Backup module** (`src/modules/backup`) zips/unzips the uploads dir with `archiver`/`unzipper`
  for files backup & restore. One-off `scripts/migrate-uploads-to-r2*` move existing local uploads
  to R2/S3.
- **`.env.example`** is a generic placeholder template — keep it that way; real values go in `.env`.
