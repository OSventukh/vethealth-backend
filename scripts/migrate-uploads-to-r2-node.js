#!/usr/bin/env node

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function parseArgs(argv) {
  const args = {
    execute: false,
    uploadsDir: path.resolve(process.cwd(), 'uploads'),
    dotenvFile: path.resolve(process.cwd(), '.env'),
    // No prefix: the backend stores R2 keys WITHOUT a leading "uploads/" segment
    // (files.service.ts strips /^uploads\//), so object keys must match e.g.
    // "images/topics/cat.svg". Pass --prefix only if the backend scheme changes.
    prefix: '',
    sample: 20,
    referer: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--execute') {
      args.execute = true;
      continue;
    }
    if (token === '--uploads-dir') {
      args.uploadsDir = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--dotenv-file' || token === '--env-file') {
      args.dotenvFile = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--prefix') {
      args.prefix = argv[i + 1].replace(/^\/+|\/+$/g, '');
      i += 1;
      continue;
    }
    if (token === '--sample') {
      args.sample = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--referer') {
      args.referer = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '-h' || token === '--help') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!Number.isInteger(args.sample) || args.sample < 1) {
    throw new Error('--sample must be a positive integer');
  }

  return args;
}

function printHelp() {
  console.log(`Usage:\n  node scripts/migrate-uploads-to-r2-node.js [options]\n\nOptions:\n  --execute                 Run real upload (default is dry-run)\n  --uploads-dir <path>      Local uploads directory (default: ./uploads)\n  --dotenv-file <path>      Path to env file (default: ./backend/.env, optional)\n  --prefix <value>          Prefix inside bucket (default: none — matches backend key scheme)\n  --sample <number>         Smoke test sample size (default: 20)\n  --referer <url>           Optional Referer for smoke checks\n  -h, --help                Show help\n\nExamples:\n  node scripts/migrate-uploads-to-r2-node.js\n  node scripts/migrate-uploads-to-r2-node.js --execute\n  node scripts/migrate-uploads-to-r2-node.js --execute --referer https://vethealth.com.ua/`);
}

function loadEnvFileIfExists(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return false;
  }

  const raw = fs.readFileSync(envFilePath, 'utf8').replace(/\r/g, '');
  const lines = raw.split('\n');
  const values = {};

  for (const line of lines) {
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

async function listFilesRecursive(dir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

function mimeFromExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.avif') return 'image/avif';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

function toObjectKey(prefix, uploadsDir, filePath) {
  const relative = path.relative(uploadsDir, filePath).split(path.sep).join('/');
  return `${prefix}/${relative}`.replace(/^\/+/, '');
}

function sampleArray(items, count) {
  if (items.length <= count) {
    return [...items];
  }

  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned.slice(0, count);
}

async function smokeCheck(publicUrl, keys, referer) {
  let ok = 0;
  let fail = 0;

  for (const key of keys) {
    const url = `${publicUrl.replace(/\/$/, '')}/${key}`;
    const headers = referer ? { Referer: referer } : {};

    let status = 0;
    try {
      const response = await fetch(url, { method: 'GET', headers });
      status = response.status;
    } catch {
      status = 0;
    }

    if (status === 200) {
      ok += 1;
      console.log(`OK   ${status}  ${url}`);
    } else {
      fail += 1;
      console.log(`FAIL ${status}  ${url}`);
    }
  }

  return { ok, fail, total: keys.length };
}

async function uploadFiles({ s3Client, bucket, uploadsDir, files, prefix, execute }) {
  let uploaded = 0;
  const total = files.length;

  if (!execute) {
    for (const filePath of files.slice(0, 30)) {
      const key = toObjectKey(prefix, uploadsDir, filePath);
      console.log(`[dry-run] ${filePath} -> s3://${bucket}/${key}`);
    }
    if (files.length > 30) {
      console.log(`[dry-run] ... and ${files.length - 30} more files`);
    }
    return uploaded;
  }

  for (const filePath of files) {
    const key = toObjectKey(prefix, uploadsDir, filePath);
    const contentType = mimeFromExtension(filePath);
    const body = await fs.promises.readFile(filePath);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    uploaded += 1;
    if (uploaded % 100 === 0 || uploaded === total) {
      console.log(`Uploaded ${uploaded}/${total}`);
    }
  }

  return uploaded;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envLoadedFromFile = loadEnvFileIfExists(args.dotenvFile);

  const required = [
    'FILE_S3_ENDPOINT',
    'FILE_S3_BUCKET',
    'FILE_S3_ACCESS_KEY',
    'FILE_S3_SECRET_KEY',
    'FILE_S3_PUBLIC_URL',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  if (!fs.existsSync(args.uploadsDir) || !fs.statSync(args.uploadsDir).isDirectory()) {
    throw new Error(`Uploads directory not found: ${args.uploadsDir}`);
  }

  const files = await listFilesRecursive(args.uploadsDir);
  if (files.length === 0) {
    console.log('No files found in uploads directory. Nothing to migrate.');
    return;
  }

  console.log('== Configuration ==');
  console.log(`Env source: ${envLoadedFromFile ? `file (${args.dotenvFile}) + process.env` : 'process.env only (.env file not found)'}`);
  console.log(`Uploads dir: ${args.uploadsDir}`);
  console.log(`Files found: ${files.length}`);
  console.log(`Bucket: ${process.env.FILE_S3_BUCKET}`);
  console.log(`Endpoint: ${process.env.FILE_S3_ENDPOINT}`);
  console.log(`Public URL: ${process.env.FILE_S3_PUBLIC_URL}`);
  console.log(`Prefix: ${args.prefix}`);
  console.log(`Mode: ${args.execute ? 'EXECUTE' : 'DRY-RUN'}`);
  console.log(`Referer: ${args.referer || '(not set)'}`);

  const s3Client = new S3Client({
    region: process.env.FILE_S3_REGION || 'auto',
    endpoint: process.env.FILE_S3_ENDPOINT,
    forcePathStyle: String(process.env.FILE_S3_FORCE_PATH_STYLE).toLowerCase() === 'true',
    credentials: {
      accessKeyId: process.env.FILE_S3_ACCESS_KEY,
      secretAccessKey: process.env.FILE_S3_SECRET_KEY,
    },
  });

  console.log('\n== Step 1/2: Upload files ==');
  await uploadFiles({
    s3Client,
    bucket: process.env.FILE_S3_BUCKET,
    uploadsDir: args.uploadsDir,
    files,
    prefix: args.prefix,
    execute: args.execute,
  });

  console.log('\n== Step 2/2: Smoke check public URLs ==');
  const sampledFiles = sampleArray(files, args.sample);
  const sampledKeys = sampledFiles.map((filePath) => toObjectKey(args.prefix, args.uploadsDir, filePath));
  const result = await smokeCheck(process.env.FILE_S3_PUBLIC_URL, sampledKeys, args.referer);

  console.log(`\nSmoke summary: total=${result.total}, ok=${result.ok}, fail=${result.fail}`);
  if (!args.execute) {
    console.log('Dry-run completed. Re-run with --execute for real upload.');
    return;
  }

  if (result.fail > 0) {
    process.exitCode = 2;
    console.error('Migration finished with smoke failures. Check CDN/WAF and object key prefix.');
    return;
  }

  console.log('Migration completed successfully.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
