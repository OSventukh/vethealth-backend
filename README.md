<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ pnpm install
$ cp .env.example .env
```

## Local development

The `docker-compose.yml` exposes two profiles:

- **`dev`** — runs only `postgres` and `mailpit` so you can run the NestJS app natively on the host (fast HMR, debugger, no rebuilds).
- **`prod`** — runs the `app` container (built from `Dockerfile`) for production deployments.

```bash
# 1. start Postgres + Mailpit
$ docker compose --profile dev up -d

# 2. run migrations
$ pnpm migration:run

# 3. start NestJS in watch mode
$ pnpm start:dev
```

- API: http://localhost:5000
- Mailpit UI: http://localhost:8025

Make sure your local `.env` points the app at the host-exposed services (`DATABASE_HOST=localhost`, `MAIL_HOST=localhost`).

## Deployment (Coolify)

Coolify runs `docker compose up` without activating any profile, so the `app` service (which has `profiles: [prod]`) needs the `prod` profile enabled explicitly. In the Coolify dashboard for this resource, add the following environment variable:

```
COMPOSE_PROFILES=prod
```

Docker Compose reads `COMPOSE_PROFILES` automatically and will start `app` while leaving `db`/`mail` out (the database is a **separate Coolify project** running MySQL, kept apart so it can be backed up independently; `app` connects to it via the `DATABASE_*` env vars).

If you see `Error: no service selected` during deploy, this variable is missing — Coolify ran
`docker compose up` with no active profile, so Compose matched zero services. Add
`COMPOSE_PROFILES=prod` to the resource's environment variables and redeploy.

## Migrating file storage to R2 / S3

Two one-off scripts in `scripts/` move an environment that was using **local** `uploads/`
storage onto an S3-compatible bucket (Cloudflare R2, S3, SeaWeed). They are independent of the
running app, read config from `.env` (or the process env), are **dry-run by default**, and are
**idempotent** (safe to re-run). Run them in this order:

```bash
# 1. Copy the physical files from ./uploads to the bucket
node scripts/migrate-uploads-to-r2-node.js              # dry-run — preview
node scripts/migrate-uploads-to-r2-node.js --execute    # real upload + smoke-checks 200s

# 2. Rewrite the DB references so they point at the bucket
node scripts/migrate-db-refs-to-r2.js --inspect          # read-only: show the actual stored forms
node scripts/migrate-db-refs-to-r2.js                    # dry-run — per-reference before/after diff
node scripts/migrate-db-refs-to-r2.js --execute          # apply
```

**Order matters:** upload the files first — otherwise the rewritten URLs point at objects that
don't exist in the bucket yet.

What the DB-refs script touches: it strips a leading `/uploads/` from `files.path` (→ bare R2
key, which `FileEntity.updatePath()` resolves to a public URL), and rewrites embedded image
references in `posts.content` (Lexical JSON), `posts.featuredImageUrl`, `pages.content` and
`metadata.{ogImage,twitterImage,structuredData}`. It works by extracting this app's canonical
object key (`images/topics/…`, `images/posts/featured/…`, `images/posts/content/…`) from whatever
prefix precedes it — a stale backend domain, an old `/uploads/` path, a leading slash, or even a
doubled domain from a previous botched run — and rebuilding it as `<public-base>/<key>`. The
`images/(posts|topics)/` anchor means external image hosts (e.g. `images.unsplash.com`) and
internal site links are left untouched.

Before running on production: take a DB dump (the rewrite is per-row `UPDATE` with no
transaction), run `--inspect` to confirm the real reference format, and verify the printed
`Public base` is the intended bucket/CDN. To replicate onto another environment afterwards,
`aws s3 sync` the bucket across, then run the DB-refs script there with that env's config.

Both scripts also accept `--help`. Required env: `DATABASE_*` (or `DATABASE_URL`), the
`FILE_S3_*` credentials, and one of `FILE_S3_PUBLIC_URL` / `FILE_CDN_BASE_URL`.

## Test

```bash
# unit tests
$ pnpm test

# e2e tests
$ pnpm test:e2e

# test coverage
$ pnpm test:cov
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
