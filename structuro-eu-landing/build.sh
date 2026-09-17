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

# Op Vercel: minify JS/CSS. Lokaal blijft de git-checkout leesbaar.
if [ "${VERCEL:-}" = "1" ]; then
  echo "Minify JS/CSS for Vercel..."
  npx --yes terser --version >/dev/null
  for f in js/*.js v2/*.js; do
    [ -f "$f" ] || continue
    npx --yes terser "$f" -o "$f" -c -m --comments false
  done
  npx --yes csso-cli --version >/dev/null
  for f in css/*.css v2/*.css; do
    [ -f "$f" ] || continue
    npx --yes csso-cli "$f" --output "$f"
  done
fi
