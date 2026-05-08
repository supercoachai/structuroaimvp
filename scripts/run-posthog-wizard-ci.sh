#!/usr/bin/env bash
# Voer de PostHog wizard non-interactief uit (EU). Vereist Personal API key (phx_),
# niet je project key (phc_). PostHog: Account → Personal API keys.
#
# Node: @posthog/wizard vraagt ^20.20.0 of >=22.22.0 (npx geeft anders EBADENGINE).
#
# Gebruik:
#   cd projectroot
#   export POSTHOG_WIZARD_API_KEY='phx_...'
#   npm run posthog:wizard:ci
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${POSTHOG_WIZARD_API_KEY:-}" ]]; then
  echo "Onbekend POSTHOG_WIZARD_API_KEY. Maak een key in PostHog (EU) onder je account-instellingen, begint met phx_" >&2
  echo "Dan: export POSTHOG_WIZARD_API_KEY='phx_...' && npm run posthog:wizard:ci" >&2
  exit 1
fi

exec npx -y "@posthog/wizard@latest" --region eu --ci \
  --integration nextjs \
  --install-dir "$ROOT" \
  --api-key "$POSTHOG_WIZARD_API_KEY"
