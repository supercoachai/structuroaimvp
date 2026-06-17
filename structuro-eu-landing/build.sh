#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

POSTHOG_KEY="${NEXT_PUBLIC_POSTHOG_KEY:-${NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:-}}"
if [ -z "$POSTHOG_KEY" ]; then
  echo "build.sh: zet NEXT_PUBLIC_POSTHOG_KEY of NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN" >&2
  exit 1
fi

sed -i "s|__STRUCTURO_PH_PROJECT_KEY__|${POSTHOG_KEY}|g" js/ph-config.js
