#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "build.sh: NEXT_PUBLIC_SUPABASE_ANON_KEY is niet gezet" >&2
  exit 1
fi
sed -i "s|__SUPABASE_ANON_KEY__|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" wachtlijst/index.html
