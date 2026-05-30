# Launch Night Runbook — 30 → 31 mei 2026

**Doel:** Structuro live om 0:00. Dit document is de enige tab die je nodig hebt.

**Branch:** `launch/compliance-paywall-tracking-2026-05-29` · commit `bc8d9e8`  
**PR:** https://github.com/supercoachai/structuroaimvp/compare/main...launch/compliance-paywall-tracking-2026-05-29  
**Env-vars blok:** `docs/VERCEL-ENV-PRODUCTIE.md`

### Status snapshot (30 mei, vóór launch night)

| Stap | Status | Opmerking |
|------|--------|-----------|
| 23:00 Supabase migratie | ✅ Gedaan | `stripe_processed_events` + profile-kolommen aanwezig (`stripe_subscription_setup`) |
| 23:15 Stripe live webhook | ⏳ Jij | Vereist Stripe Dashboard + `STRIPE_WEBHOOK_SECRET` in Vercel |
| 23:35 Vercel env vars | ⏳ Jij | MCP kan secrets niet lezen; check handmatig in Vercel UI |
| 23:50 Merge → main | ⏳ 23:50 | Branch staat **10 commits** voor op `main`; prod draait al gepromote launch-build `ff1e88e`, merge blijft nodig |
| Preview smoke (`npm run smoke:preview`) | ⚠️ 8/9 | `/registreren` laadt op prod; `/api/dev/signup` geeft 307 i.p.v. 404 (middleware redirect, geen blocker voor checkout) |

---

## 23:00 — Supabase productie (15 min)

1. Open Supabase → jouw productie-project → **SQL Editor**
2. Plak en run `supabase/migration_stripe_subscription.sql`
3. Controleer: `SELECT * FROM stripe_processed_events LIMIT 1;` geeft geen error
4. Ga naar **Project Settings → API** → kopieer **service_role** key
5. Plak in Vercel **Production** als `SUPABASE_SERVICE_ROLE_KEY`

**Klaar als:** tabel bestaat, key staat in Vercel.

---

## 23:15 — Stripe live mode (20 min)

Stripe Dashboard → schakel rechtsboven naar **Live mode** (niet Test).

1. **Webhook aanmaken:** Developers → Webhooks → Add endpoint  
   - URL: `https://www.structuro.ai/api/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `charge.refunded`
2. Klik Add endpoint → kopieer **Signing secret** (`whsec_…`)
3. Plak in Vercel **Production** als `STRIPE_WEBHOOK_SECRET`
4. **Customer Portal aan:** Settings → Billing → Customer Portal → Enable

**Klaar als:** webhook staat op structuro.ai, signing secret in Vercel.

---

## 23:35 — Vercel Production env vars (15 min)

Vercel → Project → Settings → Environment Variables → **Production**

Kopieer uit `docs/VERCEL-ENV-PRODUCTIE.md`. Vul in:

| Var | Waarde |
|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_live_…` (Stripe → Developers → API keys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (zojuist gekopieerd) |
| `SUPABASE_SERVICE_ROLE_KEY` | (zojuist gekopieerd) |
| `STRIPE_PRICE_ID_MONTHLY` | `price_1TZpgcV05ARLhkqludSsZ0P5` |
| `STRIPE_PRICE_ID_YEARLY` | `price_1TZpgeV05ARLhkqluF7sX6EZ` |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` | `price_1TZpgcV05ARLhkqludSsZ0P5` |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` | `price_1TZpgeV05ARLhkqluF7sX6EZ` |
| `STRUCTURO_PUBLIC_REGISTRATION` | `1` |
| `NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION` | `1` |
| `STRUCTURO_MIDDLEWARE_PAYWALL` | `0` |

Controleer ook (meestal al gezet):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`

Controleer dat er **geen** `sk_test_`, `price_1TZr2…`, `POSTHOG_TEST_ENDPOINT=true` of `NEXT_PUBLIC_POSTHOG_DEBUG=true` op Production staat.

**Klaar als:** alle vars opgeslagen, geen test-varianten zichtbaar.

---

## 23:50 — Merge → deploy (5 min)

```bash
git checkout main
git pull origin main
git merge --no-ff launch/compliance-paywall-tracking-2026-05-29 \
  -m "feat: launch 31 mei — paywall, registratie, checkout, consent"
git push origin main
```

Of GitHub UI: open de PR → **Merge pull request**.

Open Vercel dashboard: wacht op **Ready** (verwacht ~2–3 min).

**Klaar als:** Vercel toont Ready voor productie-deploy.

---

## 00:00 — Live smoke test (20 min)

Gebruik een **nieuw e-mailadres** (niet het beschermde testaccount).

| Stap | Wat je ziet | ✅ |
|------|-------------|---|
| `structuro.ai/registreren` | Laadt, geen redirect naar login | ☐ |
| Account aanmaken | Bevestiging, geen error | ☐ |
| `/registreren/plan` | Maand + jaar naast elkaar | ☐ |
| Stripe checkout opent | Geen "Sandboxes" banner | ☐ |
| Betaling afronden | Redirect naar `/welkom` | ☐ |
| `/welkom` | Animatie + knop "Zet je eerste stap" | ☐ |
| `/consent` | Privacy-setup verschijnt | ☐ |
| Onboarding start | Welkom-taak aanwezig (indien gekozen) | ☐ |
| Supabase `profiles` | `stripe_customer_id` gevuld | ☐ |
| Stripe live dashboard | Customer + subscription zichtbaar | ☐ |
| Stripe webhook logs | `checkout.session.completed` = 200 | ☐ |

---

## 00:20 — GO / NO-GO

**GO** → je bent live. Communiceer naar Frank / Sebastiaan / Jasper.

**NO-GO** → zet direct in Vercel **Production**:

- `STRUCTURO_PUBLIC_REGISTRATION=0`
- `NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION=0`

Vercel herdeploy (of trigger handmatig). Communiceer verschuiving.

---

## Noodcontacten tijdens launch

| Probleem | Waar kijken |
|----------|-------------|
| Checkout mislukt | Stripe Dashboard → Developers → Logs |
| Webhook = 4xx/5xx | Stripe → Webhooks → jouw endpoint → logs |
| Supabase niet gevuld | Supabase → Table Editor → profiles |
| PostHog geen events | PostHog EU → Live Events |
| Deploy niet Ready | Vercel → Deployments → build logs |

---

*Laatste update: 2026-05-30, commit `bc8d9e8`.*
