#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

# De PostHog project key staat nu hard in js/ph-config.js (juiste project).
# Alleen voor backward-compat: als er ooit weer een placeholder in staat én een
# env-var is gezet, injecteren we die. We falen NOOIT meer op een ontbrekende
# env-var, zodat een fout/ontbrekend env-veld de ingebakken key niet kan slopen.
POSTHOG_KEY="${NEXT_PUBLIC_POSTHOG_KEY:-${NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:-}}"
if [ -n "$POSTHOG_KEY" ] && grep -q "__STRUCTURO_PH_PROJECT_KEY__" js/ph-config.js; then
  sed -i "s|__STRUCTURO_PH_PROJECT_KEY__|${POSTHOG_KEY}|g" js/ph-config.js
fi
