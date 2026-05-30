# Launch checklist — 31 mei 2026 (T-1)

Levend document voor de laatste 22 uur vóór launch. Alles met `[ ]` moet af voor je **GO** zegt.

**Code-status (30 mei):** branch `launch/compliance-paywall-tracking-2026-05-29`, commit `4a008dd` op GitHub (**9 commits** vóór `main`). Build groen lokaal.

**PR (open vóór merge):** [compare main…launch-branch](https://github.com/supercoachai/structuroaimvp/compare/main...launch/compliance-paywall-tracking-2026-05-29) · merge-commando in `docs/LAUNCH-PR-DESCRIPTION.md`

**Code-scan resultaat (30 mei):**

- ✅ Geen hardcoded `sk_test_…` of `whsec_…` in source
- ✅ `POSTHOG_TEST_ENDPOINT` correct achter env-flag (niet hardcoded aan)
- ✅ `NEXT_PUBLIC_POSTHOG_DEBUG` correct achter env-flag
- ✅ `/dev-reset` en `/test-data` redirecten naar `/` in productie
- ✅ `/api/dev/signup` geblokkeerd in productie (`NODE_ENV` check)
- ⚠️ `registerPlans.ts` bevat test price IDs in `ALLOWED_STRIPE_PRICE_IDS` — niet gevaarlijk (Stripe weigert ze met live key), geen launch-blocker
- 📄 Merge-commando: `docs/LAUNCH-PR-DESCRIPTION.md`
- 📄 Vercel env-vars: `docs/VERCEL-ENV-PRODUCTIE.md`
- 📄 Preview smoke: `BASE_URL=https://preview… npm run smoke:preview` (`scripts/launch-smoke-preview.mjs`)

**Launch = GO** alleen als sectie **H (Go/no-go)** volledig afgevinkt is.

---

## A. Al gedaan (geen actie, tenzij iets ontbreekt)

- [x] Launch-branch met registratie, checkout, `/welkom`, consent, paywall-logica, legal updates
- [x] Push naar `origin/launch/compliance-paywall-tracking-2026-05-29`
- [ ] Jij hebt bevestigd dat Vercel **main** (na merge) naar Production deployt

---

## B. Supabase productie (~15 min)

- [ ] Migratie `supabase/migration_stripe_subscription.sql` gedraaid op productie-DB
- [ ] Tabel `stripe_processed_events` bestaat (webhook idempotency)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` staat in Vercel Production (niet alleen Preview)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` kloppen voor productie-project

---

## C. Vercel Production environment (~30 min)

Plak in **Vercel → Project → Settings → Environment Variables → Production**.  
Copy-paste blok: `docs/VERCEL-ENV-PRODUCTIE.md`

### Secrets (waarden zelf invullen)

- [ ] `STRIPE_SECRET_KEY` = `sk_live_…` (Stripe Dashboard → Developers → API keys, **live mode**)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_…` (live webhook, zie sectie D)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = service role uit Supabase project settings

### Stripe prijzen (live, exact deze IDs)

- [ ] `STRIPE_PRICE_ID_MONTHLY` = `price_1TZpgcV05ARLhkqludSsZ0P5`
- [ ] `STRIPE_PRICE_ID_YEARLY` = `price_1TZpgeV05ARLhkqluF7sX6EZ`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` = `price_1TZpgcV05ARLhkqludSsZ0P5`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` = `price_1TZpgeV05ARLhkqluF7sX6EZ`

### Launch flags

- [ ] `STRUCTURO_PUBLIC_REGISTRATION` = `1`
- [ ] `NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION` = `1`
- [ ] `STRUCTURO_MIDDLEWARE_PAYWALL` = `0` *(aanbevolen launch-dag; zie sectie E)*

### PostHog (controleren, niet opnieuw breken)

- [ ] `NEXT_PUBLIC_POSTHOG_KEY` staat op Production
- [ ] `NEXT_PUBLIC_POSTHOG_DEBUG` staat **niet** op `true` in Production

### Expliciet NIET op Production

- [ ] Geen `sk_test_…`
- [ ] Geen test price IDs (`price_1TZr2…`)
- [ ] Geen `POSTHOG_TEST_ENDPOINT=true` (alleen preview, zie sectie F-preview)

---

## D. Stripe Dashboard live (~20 min)

Stripe Dashboard → schakel **Live mode** (niet Test mode).

- [ ] Producten/prijzen: €12,99/maand en €119/jaar (tax inclusive)
- [ ] Webhook endpoint: `https://www.structuro.ai/api/stripe/webhook`  
  *(pas aan als productiedomein anders is)*
- [ ] Webhook events geselecteerd:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `charge.refunded`
- [ ] Signing secret gekopieerd naar Vercel als `STRIPE_WEBHOOK_SECRET`
- [ ] Customer Portal aan (Settings → Billing → Customer Portal)

---

## E. Beslissing bestaande V2-users (~10 min)

Mirror: ~30 users, 0 met `stripe_customer_id`. Kies **één** optie en vink af.

### Optie 1 — Aanbevolen launch-dag

- `STRUCTURO_MIDDLEWARE_PAYWALL` = `0` op Production
- Bestaande testers blijven werken zonder Stripe
- Nieuwe accounts via `/registreren` → betaling verplicht vóór onboarding

### Optie 2 — Hard paywall meteen

- `STRUCTURO_MIDDLEWARE_PAYWALL` = `1`
- Grace handmatig gezet in Supabase voor alle bestaande profiles (subscription_status / period end)
- Getest dat bestaande tester niet naar `/abonnement` wordt gegooid zonder reden

**Gekozen optie:** _______________

---

## F-preview. Zaterdag: preview smoke-tests (niet productie)

Op de **Vercel preview-URL** van de launch-branch:

- [ ] `/registreren` laadt (geen redirect naar `/login`)
- [ ] `/abonnement` laadt
- [ ] Automatisch: `BASE_URL=https://jouw-preview.vercel.app npm run smoke:preview`
- [ ] Vercel **Preview** env: `POSTHOG_TEST_ENDPOINT=true` + `POSTHOG_ERROR_TEST_SECRET=<random>`
- [ ] Eén keer: `GET /api/posthog-error-test?secret=…` → exception in PostHog EU (~30s)
- [ ] PostHog alert: Error tracking → Alerts → **>10 `$exception` in 15 min**
- [ ] Daarna `POSTHOG_TEST_ENDPOINT` weer **uit** op preview (vóór zondag productie)

---

## F. Deploy naar Production (~15 min, zondag 0:00)

- [ ] PR gemerged: `launch/compliance-paywall-tracking-2026-05-29` → `main`
- [ ] Vercel Production deploy status **Ready** (geen build error)
- [ ] Production URL openbaar (`https://www.structuro.ai`)
- [ ] `POSTHOG_TEST_ENDPOINT` staat **uit** op Production

---

## G. Smoke test live (~45 min)

Gebruik een **nieuw e-mailadres**. Niet het beschermde testaccount voor destructieve acties.

### Registratie + betaling

- [ ] `/registreren` laadt (geen redirect naar `/login`)
- [ ] Account aanmaken lukt
- [ ] `/registreren/plan` toont maand/jaar naast elkaar
- [ ] Checkout opent Stripe **live** pagina (geen test banner "Sandboxes")
- [ ] Betaling voltooid → redirect naar `/welkom`
- [ ] Welkomstscherm: animatie + knop "Zet je eerste stap →"

### Na betaling

- [ ] `/consent` privacy-setup verschijnt vóór dashboard
- [ ] Onboarding start na consent
- [ ] Welkom-taak aangemaakt (als checkbox aan stond op plan-pagina)

### Backend verificatie

- [ ] Supabase `profiles`: nieuw account heeft `stripe_customer_id` gevuld
- [ ] Supabase `profiles`: `subscription_status` = actief (of equivalent)
- [ ] Stripe Dashboard: customer + subscription zichtbaar in **live mode**
- [ ] Stripe webhook logs: `checkout.session.completed` = 200 OK

### PostHog (snelle check)

- [ ] Event `welcome_task_checkout_decision` zichtbaar
- [ ] Geen cluster events met `metadata_lookup_failed: true`

---

## H. Go/no-go (vóór middernacht 30 → 31 mei)

**GO** alleen als alles hieronder `[x]` is:

- [ ] Live checkout end-to-end werkt (sectie G)
- [ ] Webhook schrijft naar Supabase
- [ ] Registratie open op Production
- [ ] Bestaande users niet onverwacht geblokkeerd (sectie E)
- [ ] Legal pagina's bereikbaar: `/terms`, `/privacy`

**Beslissing:** GO / NO-GO *(streep weg)*

**Bij NO-GO:** zet `STRUCTURO_PUBLIC_REGISTRATION=0` + `NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION=0` op Production en communiceer verschuiving.

---

## I. Launch-dag ochtend 31 mei (~30 min)

- [ ] Production site opent zonder errors
- [ ] EU-landing / marketing link wijst naar `/registreren`
- [ ] Eén echte gebruikersbetaling monitoren (Stripe + Supabase + PostHog)
- [ ] Support-kanaal klaar ([info@structuro.eu](mailto:info@structuro.eu) voor refund/garantie)
- [ ] Mirror/Notion: EOD state handmatig bijwerken of task met Cowork open

---

## J. Bewust NA launch (niet T-1 blocker)

Laat deze **niet** launch tegenhouden:

- Focus `focus_exited_at` instrumentation fix
- Shutdown-completion nudge
- Notion EOD cron 11-daagse gap fix
- Pre-launch traffic bron 29 mei traceren (PostHog)
- `/abonnement` flow alignen met `/welkom` metadata (secundair pad)

---

## K. Snelle referentie flows

```
Nieuwe user:  /registreren → /registreren/plan → Stripe → /welkom → /consent → /onboarding
Bestaande user (paywall uit):  /login → app zoals nu
Paywall aan later:  STRUCTURO_MIDDLEWARE_PAYWALL=1 + grace plan
```

---

## Tijdsplan suggestie

| Wanneer | Sectie |
| -------- | ------ |
| Zaterdag (vandaag) | F-preview (preview smoke + PostHog) |
| Zaterdag avond | B + C + D + E |
| Zondag 0:00 | F (merge → main) |
| Zondag 0:00–1:00 | G |
| Vóór slapen zondag | H |
| 31 mei ochtend | I |

---

*Laatste update: 2026-05-30, commit `4a008dd` (9 commits vóór main).*
