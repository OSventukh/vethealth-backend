#!/usr/bin/env bash
set -euo pipefail

# Migrate local uploads to Cloudflare R2 via S3-compatible API.
# Default behavior is safe dry-run. Pass --execute to perform real upload.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${PROJECT_ROOT}/.env"
UPLOADS_DIR="${PROJECT_ROOT}/uploads"
R2_PREFIX="uploads"
DRY_RUN=true
SMOKE_SAMPLE=20
SMOKE_REFERER="${SMOKE_REFERER:-}"
CHECK_DB=true

print_help() {
  cat <<'EOF'
Usage:
  ./scripts/migrate-uploads-to-r2.sh [options]

Options:
  --execute                 Run real sync (without this, script runs dry-run only)
  --uploads-dir <path>      Local uploads directory (default: ./uploads)
  --prefix <value>          Prefix inside bucket (default: uploads)
  --env-file <path>         Path to env file (default: ./backend/.env)
  --sample <number>         Smoke test sample size (default: 20)
  --referer <url>           Optional Referer header for smoke checks
  --skip-db-check           Skip DB-based smoke checks
  -h, --help                Show this help

Examples:
  ./scripts/migrate-uploads-to-r2.sh
  ./scripts/migrate-uploads-to-r2.sh --execute
  ./scripts/migrate-uploads-to-r2.sh --execute --referer https://vethealth.com.ua/
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute)
      DRY_RUN=false
      shift
      ;;
    --uploads-dir)
      UPLOADS_DIR="$2"
      shift 2
      ;;
    --prefix)
      R2_PREFIX="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --sample)
      SMOKE_SAMPLE="$2"
      shift 2
      ;;
    --referer)
      SMOKE_REFERER="$2"
      shift 2
      ;;
    --skip-db-check)
      CHECK_DB=false
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_help
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# Support both LF and CRLF env files.
# shellcheck disable=SC1090
source <(tr -d '\r' < "$ENV_FILE")
set +a

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command is missing: $1" >&2
    exit 1
  fi
}

require_cmd aws
require_cmd curl
require_cmd find
require_cmd shuf

if [[ ! -d "$UPLOADS_DIR" ]]; then
  echo "Uploads directory not found: $UPLOADS_DIR" >&2
  exit 1
fi

for var in FILE_S3_ENDPOINT FILE_S3_BUCKET FILE_S3_ACCESS_KEY FILE_S3_SECRET_KEY FILE_S3_PUBLIC_URL; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required env var: $var" >&2
    exit 1
  fi
done

if ! [[ "$SMOKE_SAMPLE" =~ ^[0-9]+$ ]] || [[ "$SMOKE_SAMPLE" -lt 1 ]]; then
  echo "--sample must be a positive integer" >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="$FILE_S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$FILE_S3_SECRET_KEY"
export AWS_DEFAULT_REGION="${FILE_S3_REGION:-auto}"

UPLOADS_DIR_ABS="$(cd "$UPLOADS_DIR" && pwd)"
SYNC_SOURCE="$UPLOADS_DIR_ABS"
SYNC_DEST="s3://${FILE_S3_BUCKET}/${R2_PREFIX}"

echo "== Configuration =="
echo "Env file: $ENV_FILE"
echo "Uploads dir: $UPLOADS_DIR_ABS"
echo "Bucket: $FILE_S3_BUCKET"
echo "Endpoint: $FILE_S3_ENDPOINT"
echo "Public URL: $FILE_S3_PUBLIC_URL"
echo "Destination prefix: $R2_PREFIX"
echo "Mode: $([[ "$DRY_RUN" == true ]] && echo DRY-RUN || echo EXECUTE)"
if [[ -n "$SMOKE_REFERER" ]]; then
  echo "Smoke Referer: $SMOKE_REFERER"
else
  echo "Smoke Referer: (not set)"
fi

echo
echo "== Step 1/3: Sync uploads to R2 =="
SYNC_ARGS=(
  s3 sync
  "$SYNC_SOURCE"
  "$SYNC_DEST"
  --endpoint-url "$FILE_S3_ENDPOINT"
  --no-progress
)

if [[ "$DRY_RUN" == true ]]; then
  SYNC_ARGS+=(--dryrun)
fi

aws "${SYNC_ARGS[@]}"

echo
echo "== Step 2/3: Verify object count in destination prefix =="
set +e
OBJECT_COUNT=$(aws s3 ls "$SYNC_DEST/" --recursive --endpoint-url "$FILE_S3_ENDPOINT" | wc -l | tr -d ' ')
set -e
echo "Objects under s3://${FILE_S3_BUCKET}/${R2_PREFIX}: ${OBJECT_COUNT:-0}"

normalize_key_from_db_path() {
  local db_path="$1"
  local key="${db_path#/}"
  key="${key#uploads/}"
  printf '%s/%s\n' "$R2_PREFIX" "$key"
}

normalize_key_from_local_file() {
  local file_path="$1"
  local rel_path="${file_path#${UPLOADS_DIR_ABS}/}"
  printf '%s/%s\n' "$R2_PREFIX" "$rel_path"
}

curl_status() {
  local url="$1"
  if [[ -n "$SMOKE_REFERER" ]]; then
    curl -sS -o /dev/null -w "%{http_code}" -H "Referer: ${SMOKE_REFERER}" "$url"
  else
    curl -sS -o /dev/null -w "%{http_code}" "$url"
  fi
}

echo
echo "== Step 3/3: Smoke check public URLs =="
SMOKE_TOTAL=0
SMOKE_OK=0
SMOKE_FAIL=0

run_smoke_for_key() {
  local key="$1"
  local url="${FILE_S3_PUBLIC_URL%/}/${key}"
  local code
  code=$(curl_status "$url")
  SMOKE_TOTAL=$((SMOKE_TOTAL + 1))

  if [[ "$code" == "200" ]]; then
    SMOKE_OK=$((SMOKE_OK + 1))
    echo "OK   $code  $url"
  else
    SMOKE_FAIL=$((SMOKE_FAIL + 1))
    echo "FAIL $code  $url"
  fi
}

DB_USED=false
if [[ "$CHECK_DB" == true ]] && command -v mysql >/dev/null 2>&1; then
  if [[ -n "${DATABASE_HOST:-}" && -n "${DATABASE_PORT:-}" && -n "${DATABASE_USERNAME:-}" && -n "${DATABASE_NAME:-}" ]]; then
    MYSQL_ARGS=(
      -h "$DATABASE_HOST"
      -P "$DATABASE_PORT"
      -u "$DATABASE_USERNAME"
      "$DATABASE_NAME"
      -Nse
      "SELECT path FROM files WHERE path LIKE '/uploads/%' OR path LIKE 'uploads/%' ORDER BY RAND() LIMIT ${SMOKE_SAMPLE};"
    )

    if [[ -n "${DATABASE_PASSWORD:-}" ]]; then
      MYSQL_ARGS=(-p"$DATABASE_PASSWORD" "${MYSQL_ARGS[@]}")
    fi

    set +e
    DB_PATHS=$(mysql "${MYSQL_ARGS[@]}")
    DB_EXIT=$?
    set -e

    if [[ $DB_EXIT -eq 0 && -n "$DB_PATHS" ]]; then
      DB_USED=true
      while IFS= read -r db_path; do
        [[ -z "$db_path" ]] && continue
        key=$(normalize_key_from_db_path "$db_path")
        run_smoke_for_key "$key"
      done <<< "$DB_PATHS"
    else
      echo "DB smoke source unavailable, fallback to local file sampling."
    fi
  fi
fi

if [[ "$DB_USED" == false ]]; then
  while IFS= read -r local_file; do
    [[ -z "$local_file" ]] && continue
    key=$(normalize_key_from_local_file "$local_file")
    run_smoke_for_key "$key"
  done < <(
    find "$UPLOADS_DIR_ABS" -type f | shuf -n "$SMOKE_SAMPLE"
  )
fi

echo
echo "Smoke summary: total=${SMOKE_TOTAL}, ok=${SMOKE_OK}, fail=${SMOKE_FAIL}"

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry-run completed. Re-run with --execute to upload files for real."
  exit 0
fi

if [[ "$SMOKE_FAIL" -gt 0 ]]; then
  echo "Migration completed with smoke check failures. Review CDN/WAF rules and object paths." >&2
  exit 2
fi

echo "Migration completed successfully."
