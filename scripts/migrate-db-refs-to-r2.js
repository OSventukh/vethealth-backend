#!/usr/bin/env node

/* eslint-disable no-console */

// Rewrite database references to local uploads so they point at R2 / S3 storage.
//
// This is the DB counterpart to `migrate-uploads-to-r2-node.js` (which only
// copies the physical files). Run the file-upload script FIRST, verify the
// smoke checks pass, then run this one.
//
// Default behavior is a safe dry-run. Pass --execute to apply the UPDATEs.
// The script is idempotent: once paths/URLs are rewritten, re-running finds
// nothing left to change.
//
// What it rewrites:
//   1. files.path                — strips the leading "/" and "uploads/" segment
//                                  so the row stores a bare R2 key (e.g.
//                                  "/uploads/images/topics/cat.svg" -> "images/topics/cat.svg").
//                                  The FileEntity.updatePath() hook then builds
//                                  the public URL from the R2 key automatically.
//   2. posts.content             — embedded <img> URLs in the Lexical rich text
//   3. posts.featuredImageUrl    — stored featured-image URL
//   4. pages.content             — embedded URLs in page rich text
//   5. metadata.ogImage          — Open Graph image URL
//   6. metadata.twitterImage     — Twitter card image URL
//   7. metadata.canonicalUrl     — only if it points at /uploads/
//   8. metadata.structuredData   — JSON-LD blob (URL substrings swapped in-place)
//
// For the text/URL fields it replaces both the absolute form
// "<old-base>/uploads/..." and the relative form "/uploads/..." with
// "<public-base>/...". The absolute form is replaced first (innermost REPLACE)
// so the relative pass cannot corrupt an already-absolute URL.

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function parseArgs(argv) {
  const args = {
    execute: false,
    dotenvFile: path.resolve(process.cwd(), '.env'),
    publicUrl: '',
    oldBases: [],
    sample: 10,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--execute') {
      args.execute = true;
      continue;
    }
    if (token === '--dotenv-file' || token === '--env-file') {
      args.dotenvFile = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--public-url') {
      args.publicUrl = argv[i + 1].replace(/\/+$/, '');
      i += 1;
      continue;
    }
    if (token === '--old-base') {
      args.oldBases.push(argv[i + 1].replace(/\/+$/, ''));
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
    `Usage:\n  node scripts/migrate-db-refs-to-r2.js [options]\n\nOptions:\n  --execute                 Apply the UPDATEs (default is dry-run)\n  --env-file <path>         Path to env file (default: ./.env)\n  --public-url <url>        Public base for R2 objects (default: derived from\n                            FILE_CDN_BASE_URL / FILE_S3_PUBLIC_URL + bucket)\n  --old-base <url>          Old absolute base to strip before /uploads/ (repeatable;\n                            default: BACKEND_DOMAIN). Use when prod content embeds a\n                            different domain than BACKEND_DOMAIN.\n  --sample <number>         How many before/after samples to print per table (default: 10)\n  -h, --help                Show help\n\nExamples:\n  node scripts/migrate-db-refs-to-r2.js                          # dry-run\n  node scripts/migrate-db-refs-to-r2.js --execute\n  node scripts/migrate-db-refs-to-r2.js --old-base https://api.vethealth.com.ua --execute`,
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

// Build a nested REPLACE() SQL expression that rewrites every absolute
// "<oldBase>/uploads/" first, then any leftover relative "/uploads/".
// Absolute bases are nested innermost so the relative pass runs last and
// cannot break an already-rewritten absolute URL.
function buildReplaceExpr(column, oldBases, publicBase) {
  let expr = column;
  for (const base of oldBases) {
    expr = `REPLACE(${expr}, ${mysql.escape(`${base}/uploads/`)}, ${mysql.escape(`${publicBase}/`)})`;
  }
  // Outermost: relative "/uploads/" -> "<publicBase>/".
  expr = `REPLACE(${expr}, '/uploads/', ${mysql.escape(`${publicBase}/`)})`;
  return expr;
}

// A row needs URL rewriting if it still contains "/uploads/" anywhere.
const URL_FILTER = (column) => `${column} LIKE '%/uploads/%'`;

async function migrateUrlField(conn, args, { table, idColumn, column }) {
  const replaceExpr = buildReplaceExpr(column, args.oldBases, args.publicBase);
  const where = `${column} IS NOT NULL AND ${URL_FILTER(column)}`;

  const [rows] = await conn.query(
    `SELECT ${idColumn} AS id, ${column} AS value, ${replaceExpr} AS next
       FROM \`${table}\`
      WHERE ${where}`,
  );

  console.log(`\n[${table}.${column}] rows to update: ${rows.length}`);
  for (const row of rows.slice(0, args.sample)) {
    const before = String(row.value);
    const after = String(row.next);
    console.log(`  id=${row.id}`);
    console.log(`    - ${truncate(before)}`);
    console.log(`    + ${truncate(after)}`);
  }
  if (rows.length > args.sample) {
    console.log(`  ... and ${rows.length - args.sample} more`);
  }

  if (args.execute && rows.length > 0) {
    const [result] = await conn.query(
      `UPDATE \`${table}\` SET ${column} = ${replaceExpr} WHERE ${where}`,
    );
    console.log(`  -> updated ${result.affectedRows} row(s)`);
  }

  return rows.length;
}

async function migrateFilesPath(conn, args) {
  // "/uploads/images/x.svg" or "uploads/images/x.svg" -> "images/x.svg".
  const stripExpr = `REGEXP_REPLACE(path, '^/?uploads/', '')`;
  const where = `path REGEXP '^/?uploads/'`;

  const [rows] = await conn.query(
    `SELECT id, path AS value, ${stripExpr} AS next FROM files WHERE ${where}`,
  );

  console.log(`\n[files.path] rows to update: ${rows.length}`);
  for (const row of rows.slice(0, args.sample)) {
    console.log(`  id=${row.id}`);
    console.log(`    - ${row.value}`);
    console.log(`    + ${row.next}`);
  }
  if (rows.length > args.sample) {
    console.log(`  ... and ${rows.length - args.sample} more`);
  }

  if (args.execute && rows.length > 0) {
    const [result] = await conn.query(
      `UPDATE files SET path = ${stripExpr} WHERE ${where}`,
    );
    console.log(`  -> updated ${result.affectedRows} row(s)`);
  }

  return rows.length;
}

function truncate(value, max = 160) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envLoaded = loadEnvFileIfExists(args.dotenvFile);

  args.publicBase = args.publicUrl || derivePublicBase();
  if (!args.publicBase) {
    throw new Error(
      'Public base URL is empty. Set FILE_CDN_BASE_URL or FILE_S3_PUBLIC_URL, or pass --public-url.',
    );
  }

  if (args.oldBases.length === 0) {
    const backendDomain = (process.env.BACKEND_DOMAIN || '').replace(/\/+$/, '');
    if (backendDomain) {
      args.oldBases.push(backendDomain);
    }
  }

  const dbConfig = buildDbConfig();

  console.log('== Configuration ==');
  console.log(
    `Env source: ${envLoaded ? `file (${args.dotenvFile}) + process.env` : 'process.env only (.env not found)'}`,
  );
  console.log(`Database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`Public base: ${args.publicBase}`);
  console.log(`Old absolute bases: ${args.oldBases.length ? args.oldBases.join(', ') : '(none)'}`);
  console.log(`Mode: ${args.execute ? 'EXECUTE' : 'DRY-RUN'}`);

  const conn = await mysql.createConnection({
    ...dbConfig,
    multipleStatements: false,
  });

  let total = 0;
  try {
    total += await migrateFilesPath(conn, args);

    const urlFields = [
      { table: 'posts', idColumn: 'id', column: 'content' },
      { table: 'posts', idColumn: 'id', column: 'featuredImageUrl' },
      { table: 'pages', idColumn: 'id', column: 'content' },
      { table: 'metadata', idColumn: 'id', column: 'ogImage' },
      { table: 'metadata', idColumn: 'id', column: 'twitterImage' },
      { table: 'metadata', idColumn: 'id', column: 'canonicalUrl' },
      { table: 'metadata', idColumn: 'id', column: 'structuredData' },
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
