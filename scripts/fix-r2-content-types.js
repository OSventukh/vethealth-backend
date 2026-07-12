#!/usr/bin/env node

/* eslint-disable no-console */

// Repair objects in R2/S3 whose stored Content-Type does not match their actual
// bytes.
//
// Why this exists: until the `sniffImageType` fix, the backend trusted the
// mimetype declared by the browser, which the browser derives from the file
// EXTENSION. An AVIF file named "cat.jpeg" therefore landed in the bucket as
// `image/jpeg`. Firefox sniffs the real bytes, sees the mismatch and blocks the
// response (OpaqueResponseBlocking → NS_BINDING_ABORTED), so the image never
// renders even though the object is present and public.
//
// This script lists the bucket, reads the first bytes of every object, detects
// the real image type by magic number, and rewrites the Content-Type of the
// objects that lie about themselves.
//
// The rewrite is done with CopyObject (same key, MetadataDirective=REPLACE), so
// no bytes are re-uploaded and no URL changes — the object keys, and therefore
// every reference already stored in the DB, stay exactly as they are. Nothing
// else to migrate afterwards.
//
// Default is a safe dry-run; pass --execute to apply. Idempotent: a second run
// finds nothing to fix.
//
// Usage:
//   node scripts/fix-r2-content-types.js                 # dry-run against .env
//   node scripts/fix-r2-content-types.js --execute
//   node scripts/fix-r2-content-types.js --env-file .env.staging --prefix images/
//
// NOTE: extensions are intentionally NOT renamed. Renaming a key would break
// every DB reference to it; the Content-Type is what browsers actually honor,
// and CDN/R2 serve the stored header, not the extension.

const fs = require('fs');
const path = require('path');
const {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
} = require('@aws-sdk/client-s3');

function parseArgs(argv) {
  const args = {
    execute: false,
    dotenvFile: path.resolve(process.cwd(), '.env'),
    prefix: '',
    limit: 0,
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
    if (token === '--prefix') {
      args.prefix = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (token === '--limit') {
      args.limit = Number(argv[i + 1]) || 0;
      i += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      console.log(
        [
          'Usage: node scripts/fix-r2-content-types.js [options]',
          '',
          '  --execute            Apply the fixes (default: dry-run)',
          '  --env-file <path>    .env to read storage credentials from',
          '  --prefix <prefix>    Only scan keys under this prefix',
          '  --limit <n>          Stop after inspecting n objects (debugging)',
        ].join('\n'),
      );
      process.exit(0);
    }
  }

  return args;
}

function loadEnvFileIfExists(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return false;
  }

  const raw = fs.readFileSync(envFilePath, 'utf8').replace(/\r/g, '');

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

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  return true;
}

const asciiAt = (buffer, offset, length) =>
  buffer.subarray(offset, offset + length).toString('ascii');

/**
 * Mirrors src/modules/files/utils/sniff-image-type.ts — keep the two in sync.
 */
function sniffImageType(buffer) {
  if (buffer.length < 12) {
    return null;
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer[0] === 0x89 &&
    asciiAt(buffer, 1, 3) === 'PNG' &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (asciiAt(buffer, 0, 3) === 'GIF') {
    return 'image/gif';
  }

  if (asciiAt(buffer, 0, 4) === 'RIFF' && asciiAt(buffer, 8, 4) === 'WEBP') {
    return 'image/webp';
  }

  if (asciiAt(buffer, 4, 4) === 'ftyp') {
    const brand = asciiAt(buffer, 8, 4);
    if (brand === 'avif' || brand === 'avis') {
      return 'image/avif';
    }
    if (brand === 'heic' || brand === 'heix' || brand === 'mif1') {
      return 'image/heic';
    }
  }

  const head = buffer.subarray(0, 1024).toString('utf8').trimStart();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    if (/<svg[\s>]/i.test(head)) {
      return 'image/svg+xml';
    }
  }

  return null;
}

/** image/jpg, IMAGE/JPEG and image/jpeg all mean the same thing. */
function isEquivalent(stored, actual) {
  if (!stored) {
    return false;
  }

  const normalize = (value) => {
    const type = value.split(';')[0].trim().toLowerCase();
    return type === 'image/jpg' ? 'image/jpeg' : type;
  };

  return normalize(stored) === normalize(actual);
}

async function listAllObjects(s3Client, bucket, prefix, limit) {
  const keys = [];
  let continuationToken;

  do {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents || []) {
      // Directory placeholders carry no bytes to sniff.
      if (object.Size > 0) {
        keys.push(object.Key);
      }
      if (limit && keys.length >= limit) {
        return keys;
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

/** Reads only the first bytes — enough for every magic number we check. */
async function readHead(s3Client, bucket, key) {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-1023' }),
  );

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFileIfExists(args.dotenvFile);

  const required = [
    'FILE_S3_ENDPOINT',
    'FILE_S3_BUCKET',
    'FILE_S3_ACCESS_KEY',
    'FILE_S3_SECRET_KEY',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')} (checked ${args.dotenvFile})`,
    );
  }

  const bucket = process.env.FILE_S3_BUCKET;
  const s3Client = new S3Client({
    region: process.env.FILE_S3_REGION || 'auto',
    endpoint: process.env.FILE_S3_ENDPOINT,
    forcePathStyle:
      String(process.env.FILE_S3_FORCE_PATH_STYLE).toLowerCase() === 'true',
    credentials: {
      accessKeyId: process.env.FILE_S3_ACCESS_KEY,
      secretAccessKey: process.env.FILE_S3_SECRET_KEY,
    },
  });

  console.log(`Bucket:   ${bucket}`);
  console.log(`Endpoint: ${process.env.FILE_S3_ENDPOINT}`);
  console.log(`Mode:     ${args.execute ? 'EXECUTE' : 'dry-run'}\n`);

  const keys = await listAllObjects(s3Client, bucket, args.prefix, args.limit);
  console.log(`Objects to inspect: ${keys.length}\n`);

  const stats = { total: 0, ok: 0, fixed: 0, unknown: 0, failed: 0 };

  for (const key of keys) {
    stats.total += 1;

    try {
      const head = await s3Client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      const storedType = head.ContentType || '';
      const bytes = await readHead(s3Client, bucket, key);
      const actualType = sniffImageType(bytes);

      if (!actualType) {
        stats.unknown += 1;
        console.log(`?  ${key}\n     не розпізнано (stored: ${storedType || '—'})`);
        continue;
      }

      if (isEquivalent(storedType, actualType)) {
        stats.ok += 1;
        continue;
      }

      console.log(`!  ${key}\n     ${storedType || '—'}  ->  ${actualType}`);

      if (args.execute) {
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            Key: key,
            // Same key: rewrite metadata in place, bytes are not re-uploaded.
            CopySource: `${bucket}/${key}`,
            ContentType: actualType,
            MetadataDirective: 'REPLACE',
            CacheControl: head.CacheControl,
          }),
        );
      }

      stats.fixed += 1;
    } catch (error) {
      stats.failed += 1;
      console.error(`x  ${key}\n     ${error.message || error}`);
    }
  }

  console.log(
    [
      '',
      `Разом:          ${stats.total}`,
      `Коректні:       ${stats.ok}`,
      `${args.execute ? 'Виправлено:     ' : 'До виправлення: '}${stats.fixed}`,
      `Не розпізнано:  ${stats.unknown}`,
      `Помилки:        ${stats.failed}`,
    ].join('\n'),
  );

  if (!args.execute && stats.fixed > 0) {
    console.log('\nDry-run. Перезапустіть з --execute, щоб застосувати.');
  }

  if (args.execute && stats.fixed > 0) {
    console.log(
      '\nГотово. Cloudflare може віддавати стару відповідь із кешу — за потреби' +
        '\nзробіть purge для виправлених URL.',
    );
  }

  if (stats.failed > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
