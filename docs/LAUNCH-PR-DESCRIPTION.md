# PR: launch/compliance-paywall-tracking-2026-05-29 → main

**Merge dit om 0:00 op 31 mei 2026 voor live-gang.**

---

## Wat zit erin (6 commits)

| Commit | Inhoud |
|--------|--------|
| `1cbbf20` | Launch readiness: paywall-middleware, account-delete, error tracking |
| `2553827` | T-1 launch flow: consent gate, welkom UX, checkout metadata |
| `dd547d4` | Fix onboarding: gestagede eerste-dagstart zonder herstart-loops |
| `f15243e` | PostHog source map plugin alleen bij geldige phx_-key |
| `0bed799` | TypeScript-narrowing fix voor PostHog source map config |
| `ff1e88e` | Polish dagstart UX: toasts, info-wolkje, swipe-stack, confetti |

## Routes die nieuw zijn of fundamenteel gewijzigd

- `GET /registreren` — publiek registratieformulier (achter `STRUCTURO_PUBLIC_REGISTRATION=1`)
- `GET /registreren/plan` — plan-keuze maand/jaar (live Stripe price IDs)
- `POST /api/checkout/create-session` — Stripe checkout (live keys vereist)
- `POST /api/checkout/welcome-task` — welkomtaak aanmaken na betaling
- `GET /welkom` — successcherm na checkout
- `GET /consent` — privacy-setup gate vóór onboarding
- `POST /api/stripe/webhook` — webhook handler (idempotent via stripe_processed_events)
- `POST /api/account/delete` — zelfservice accountverwijdering

## Vereiste Vercel Production env vars vóór merge

Zie `docs/VERCEL-ENV-PRODUCTIE.md` voor het complete copy-paste blok.

De kritische drie die fout gaan als ze ontbreken:
- `STRIPE_SECRET_KEY=sk_live_…`
- `STRIPE_WEBHOOK_SECRET=whsec_…` (live webhook)
- `STRUCTURO_PUBLIC_REGISTRATION=1`

## Smoke test

**Automatisch (preview, geen betaling):**

```bash
BASE_URL=https://jouw-preview.vercel.app npm run smoke:preview
```

Optioneel PostHog error-route (preview env: `POSTHOG_TEST_ENDPOINT=true` + secret):

```bash
BASE_URL=https://... POSTHOG_ERROR_TEST_SECRET=... npm run smoke:preview
```

**Handmatig** na merge → Vercel deployt automatisch → sectie G in `docs/LAUNCH-CHECKLIST-2026-05-31.md`.

---

## Hoe mergen

```bash
# Terminal op jouw machine (in de repo-map):
git checkout main
git merge --no-ff launch/compliance-paywall-tracking-2026-05-29 \
  -m "feat: launch 31 mei — paywall, registratie, checkout, consent"
git push origin main
```

Of via GitHub UI: open de PR en klik **Merge pull request**.

> Vercel herkent de push naar `main` en start automatisch een Production deploy.
> Verwacht bouwtijd: ~2-3 min. Controleer Vercel dashboard of de deploy "Ready" is.
