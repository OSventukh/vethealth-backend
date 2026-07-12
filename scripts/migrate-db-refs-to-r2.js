#!/usr/bin/env node

/* eslint-disable no-console */

// Rewrite database references to uploaded images so they point at R2 / S3 storage.
//
// This is the DB counterpart to `migrate-uploads-to-r2-node.js` (which only
// copies the physical files). Run the file-upload script FIRST, verify the
// smoke checks pass, then run this one.
//
// Run `--inspect` first (read-only) to see the actual stored reference forms.
// Default behavior is a safe dry-run; pass --execute to apply the UPDATEs. The
// script is idempotent: once references are rewritten, re-running finds nothing
// to change.
//
// What it rewrites:
//   1. files.path  — strips a leading "/" and "uploads/" so the row stores a bare
//                    R2 key ("/uploads/images/topics/cat.svg" -> "images/topics/cat.svg").
//                    FileEntity.updatePath() then builds the public URL from the
//                    key. (No-op if the column already holds bare keys.)
//   2. text/URL columns that embed an image — posts.content (Lexical JSON),
//      posts.featuredImageUrl, pages.content, metadata.{ogImage,twitterImage,
//      structuredData}. Every reference to an uploaded image ends with one of this
//      app's canonical R2 keys: "images/topics/…", "images/posts/featured/…" or
//      "images/posts/content/…". We capture that key and rebuild it as
//      "<public-base>/<key>", DISCARDING whatever prefix precedes it — a stale
//      backend domain, an old "/uploads/" path, a leading slash, or even a DOUBLED
//      domain left by a previous botched migration
//      ("https://server…https://cdn…/images/…"). This is domain-agnostic and
//      idempotent.
//
// Because the match is anchored on "images/(posts|topics)/", external image hosts
// (e.g. images.unsplash.com/photo-…) and internal site links are left untouched.

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function parseArgs(argv) {
  const args = {
    execute: false,
    inspect: false,
    dotenvFile: path.resolve(process.cwd(), '.env'),
    publicUrl: '',
    sample: 10,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--execute') {
      args.execute = true;
      continue;
    }
    if (token === '--inspect') {
      args.inspect = true;
      continue;
    }
    // NB: no `--env-file` alias — Node reserves that flag for itself.
    if (token === '--dotenv-file') {
      args.dotenvFile = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--public-url') {
      args.publicUrl = argv[i + 1].replace(/\/+$/, '');
      i += 1;
      continue;
    }
    if (token === '--sample') {
      args.sample = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '-h' || token === '--help') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!Number.isInteger(args.sample) || args.sample < 0) {
    throw new Error('--sample must be a non-negative integer');
  }

  return args;
}

function printHelp() {
  console.log(
    `Usage:\n  node scripts/migrate-db-refs-to-r2.js [options]\n\nOptions:\n  --inspect                 Read-only: print row counts and the actual stored\n                            reference forms (run this first if the migration\n                            reports 0 rows to confirm the real format)\n  --execute                 Apply the UPDATEs (default is dry-run)\n  --dotenv-file <path>      Path to env file (default: ./.env). Do NOT use\n                            --env-file: Node reserves that flag.\n  --public-url <url>        Public base for R2 objects (default: derived from\n                            FILE_CDN_BASE_URL / FILE_S3_PUBLIC_URL + bucket)\n  --sample <number>         How many before/after samples to print per table (default: 10)\n  -h, --help                Show help\n\nExamples:\n  node scripts/migrate-db-refs-to-r2.js                 # dry-run\n  node scripts/migrate-db-refs-to-r2.js --execute`,
  );
}

function loadEnvFileIfExists(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return false;
  }

  const raw = fs.readFileSync(envFilePath, 'utf8').replace(/\r/g, '');
  const values = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return Object.keys(values).length > 0;
}

// Mirror FileEntity.updatePath() / S3CompatibleFileStorageService.getPublicUrl().
function derivePublicBase() {
  const cdnBaseUrl = (process.env.FILE_CDN_BASE_URL || '').replace(/\/+$/, '');
  const s3PublicUrl = (process.env.FILE_S3_PUBLIC_URL || '').replace(/\/+$/, '');
  const base = cdnBaseUrl || s3PublicUrl;
  if (!base) {
    return '';
  }
  const includeBucket =
    String(process.env.FILE_CDN_INCLUDE_BUCKET_IN_PATH).toLowerCase() === 'true';
  const bucket = process.env.FILE_S3_BUCKET;
  return includeBucket && bucket ? `${base}/${bucket}` : base;
}

function buildDbConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
    };
  }

  const required = ['DATABASE_HOST', 'DATABASE_USERNAME', 'DATABASE_NAME'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key} (or set DATABASE_URL)`);
    }
  }

  return {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  };
}

// The canonical R2 object keys this app produces are "images/topics/…",
// "images/posts/featured/…" and "images/posts/content/…" (see files.service.ts
// createStorageKey). Every image reference embedded in content ends with one of
// these keys, possibly prefixed by junk: a stale backend domain, an old
// "/uploads/" path, a leading slash, or even a DOUBLED domain left by a previous
// botched migration (e.g. "https://server…https://cdn…/images/…").
//
// Rather than guess the prefix, we capture the key itself and rebuild it as
// "<publicBase>/<key>". This collapses all of the above into the correct CDN URL
// and is idempotent. The "images/(posts|topics)/" anchor is specific enough that
// external URLs (e.g. images.unsplash.com/photo-…) and internal site links are
// left untouched.
// The colon in the scheme is OPTIONAL (`https?:?//`) on purpose: some rows hold
// a mangled "https//host/images/…" (colon lost somewhere upstream). With a
// mandatory colon the prefix would not match, the regex would fall through to
// the leading "/" of "/images/…" and prepend the CDN base to the broken prefix —
// producing the "https//host…https://cdn…/images/…" doubling this script is
// supposed to repair. Allowing the colonless form makes the prefix get consumed
// and rebuilt correctly, and keeps the doubled form repairable too.
const IMG_KEY_RE =
  /(?:https?:?\/\/[^"'\s\\)]*?)?\/?(images\/(?:posts|topics)\/[^"'\s\\)]+)/gi;

function rewriteImageRefs(value, publicBase) {
  return value.replace(IMG_KEY_RE, `${publicBase}/$1`);
}

// "/uploads/images/x.svg" or "uploads/images/x.svg" -> "images/x.svg".
function stripUploadsPrefix(value) {
  return value.replace(/^\/?uploads\//, '');
}

// "/uploads/images/x.svg" or "uploads/images/x.svg" -> "images/x.svg".
function stripUploadsPrefix(value) {
  return value.replace(/^\/?uploads\//, '');
}

async function migrateFilesPath(conn, args) {
  const [rows] = await conn.query(
    `SELECT id, path AS value FROM files WHERE path REGEXP '^/?uploads/'`,
  );

  const changes = rows
    .map((row) => ({ id: row.id, before: String(row.value), after: stripUploadsPrefix(String(row.value)) }))
    .filter((c) => c.before !== c.after);

  console.log(`\n[files.path] rows to update: ${changes.length}`);
  for (const change of changes.slice(0, args.sample)) {
    console.log(`  id=${change.id}`);
    console.log(`    - ${change.before}`);
    console.log(`    + ${change.after}`);
  }
  if (changes.length > args.sample) {
    console.log(`  ... and ${changes.length - args.sample} more`);
  }

  if (args.execute) {
    for (const change of changes) {
      await conn.query(`UPDATE files SET path = ? WHERE id = ?`, [change.after, change.id]);
    }
    if (changes.length > 0) {
      console.log(`  -> updated ${changes.length} row(s)`);
    }
  }

  return changes.length;
}

async function migrateUrlField(conn, args, { table, column, isJson }) {
  // JSON columns are auto-parsed by mysql2 into JS objects; CAST to CHAR to get
  // the raw text so we can regex it (and write a valid-JSON string back).
  const selectExpr = isJson ? `CAST(\`${column}\` AS CHAR)` : `\`${column}\``;
  // Only rows that actually embed one of our R2 object keys — this skips
  // external image hosts and internal site links entirely.
  const [rows] = await conn.query(
    `SELECT id, ${selectExpr} AS value FROM \`${table}\`
      WHERE ${selectExpr} LIKE '%images/posts/%' OR ${selectExpr} LIKE '%images/topics/%'`,
  );

  const changes = [];
  for (const row of rows) {
    const before = String(row.value);
    const after = rewriteImageRefs(before, args.publicBase);
    if (before !== after) {
      changes.push({ id: row.id, before, after });
    }
  }

  console.log(`\n[${table}.${column}] rows to update: ${changes.length}`);
  for (const change of changes.slice(0, args.sample)) {
    console.log(`  id=${change.id}`);
    // Show the per-reference diff — the embedded image URLs are what matter, and
    // the surrounding Lexical JSON / HTML is too large to print in full.
    const uniqueBefore = [...new Set(change.before.match(IMG_KEY_RE) || [])];
    for (const url of uniqueBefore.slice(0, 5)) {
      console.log(`    - ${url}`);
      console.log(`    + ${rewriteImageRefs(url, args.publicBase)}`);
    }
    if (uniqueBefore.length > 5) {
      console.log(`    ... and ${uniqueBefore.length - 5} more URL(s) in this row`);
    }
  }
  if (changes.length > args.sample) {
    console.log(`  ... and ${changes.length - args.sample} more row(s)`);
  }

  if (args.execute) {
    for (const change of changes) {
      await conn.query(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`, [
        change.after,
        change.id,
      ]);
    }
    if (changes.length > 0) {
      console.log(`  -> updated ${changes.length} row(s)`);
    }
  }

  return changes.length;
}

// Read-only diagnostic: print row counts and the actual stored forms of file
// references, so we can SEE how images are referenced before trusting any filter.
async function inspect(conn) {
  // Catch every plausible image reference: Lexical "src" values, absolute URLs,
  // and bare object keys like "images/posts/content/…​.png".
  const tokenRe =
    /"src"\s*:\s*"[^"]*"|https?:\/\/[^\s"'<>\\)]+|\/?(?:uploads\/)?images\/[^\s"'<>\\)]+/gi;
  const IMG_EXT_RE = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp)/i;

  async function count(table) {
    const [[row]] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
    return row.c;
  }

  console.log(`\n[files] ${await count('files')} rows — sample path values:`);
  const [files] = await conn.query('SELECT path FROM files LIMIT 15');
  for (const row of files) {
    console.log(`  ${JSON.stringify(row.path)}`);
  }

  for (const { table, column, isJson } of [
    { table: 'posts', column: 'content' },
    { table: 'posts', column: 'featuredImageUrl' },
    { table: 'pages', column: 'content' },
    { table: 'metadata', column: 'ogImage' },
    { table: 'metadata', column: 'structuredData', isJson: true },
  ]) {
    const selectExpr = isJson ? `CAST(\`${column}\` AS CHAR)` : `\`${column}\``;
    // Scan ALL non-null rows (volumes are small), not just the first few.
    const [rows] = await conn.query(
      `SELECT id, ${selectExpr} AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`,
    );
    console.log(
      `\n[${table}.${column}] ${await count(table)} rows total, ${rows.length} non-null — reference tokens:`,
    );

    const tokens = new Set();
    let firstImgExcerpt = null;
    for (const row of rows) {
      const value = String(row.value);
      for (const m of value.match(tokenRe) || []) {
        tokens.add(m);
      }
      if (!firstImgExcerpt) {
        const hit = value.search(IMG_EXT_RE);
        if (hit !== -1) {
          const start = Math.max(0, hit - 120);
          firstImgExcerpt = { id: row.id, text: value.slice(start, hit + 60) };
        }
      }
    }

    if (tokens.size === 0) {
      console.log('  (no src / http / images-key tokens found)');
    }
    for (const t of [...tokens].slice(0, 25)) {
      console.log(`  ${t}`);
    }
    if (tokens.size > 25) {
      console.log(`  ... and ${tokens.size - 25} more distinct token(s)`);
    }
    if (firstImgExcerpt) {
      console.log(`  raw excerpt around first image (id=${firstImgExcerpt.id}):`);
      console.log(`    …${firstImgExcerpt.text}…`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envLoaded = loadEnvFileIfExists(args.dotenvFile);

  if (args.inspect) {
    const dbConfig = buildDbConfig();
    console.log('== Inspect ==');
    console.log(
      `Env source: ${envLoaded ? `file (${args.dotenvFile})` : 'process.env only (.env not found)'}`,
    );
    console.log(`Database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: false });
    try {
      await inspect(conn);
    } finally {
      await conn.end();
    }
    return;
  }

  args.publicBase = args.publicUrl || derivePublicBase();
  if (!args.publicBase) {
    throw new Error(
      'Public base URL is empty. Set FILE_CDN_BASE_URL or FILE_S3_PUBLIC_URL, or pass --public-url.',
    );
  }

  const dbConfig = buildDbConfig();

  console.log('== Configuration ==');
  console.log(
    `Env source: ${envLoaded ? `file (${args.dotenvFile}) + process.env` : 'process.env only (.env not found)'}`,
  );
  console.log(`Database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`Public base: ${args.publicBase}`);
  console.log(`Mode: ${args.execute ? 'EXECUTE' : 'DRY-RUN'}`);

  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: false });

  let total = 0;
  try {
    total += await migrateFilesPath(conn, args);

    const urlFields = [
      { table: 'posts', column: 'content' },
      { table: 'posts', column: 'featuredImageUrl' },
      { table: 'pages', column: 'content' },
      { table: 'metadata', column: 'ogImage' },
      { table: 'metadata', column: 'twitterImage' },
      { table: 'metadata', column: 'canonicalUrl' },
      { table: 'metadata', column: 'structuredData', isJson: true },
    ];

    for (const field of urlFields) {
      total += await migrateUrlField(conn, args, field);
    }
  } finally {
    await conn.end();
  }

  console.log(`\nTotal rows needing changes: ${total}`);
  if (!args.execute) {
    console.log('Dry-run completed. Re-run with --execute to apply.');
    return;
  }
  console.log('Database reference migration completed.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
