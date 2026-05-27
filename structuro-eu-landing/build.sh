#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [ -z "${NEXT_PUBLIC_POSTHOG_KEY:-}" ]; then
  echo "build.sh: NEXT_PUBLIC_POSTHOG_KEY is niet gezet" >&2
  exit 1
fi
sed -i "s|__STRUCTURO_PH_PROJECT_KEY__|${NEXT_PUBLIC_POSTHOG_KEY}|g" js/ph-config.js
