# Structuro — Claude context (main, juni 2026)

Technische context voor AI-assistenten. Houd dit bestand sync met `main`.

## Routes (kern)

| Route | Doel |
|-------|------|
| `/login`, `/registreren` | Auth + signup |
| `/onboarding` | 10 slides, eerste dagstart in slide 9 |
| `/consent` | Privacy + analytics-keuze (localStorage) |
| `/` | Home + dagstart-overlay (`DagstartFlow`) |
| `/focus`, `/shutdown`, `/todo`, `/settings` | Core loop |
| `/abonnement` | Paywall na verlopen trial/abonnement |

Verwijderd: `/gamification`, `/agenda`.

## Middleware (`src/lib/supabase/middleware.ts`)

1. Geen sessie → `/login` (publieke uitzonderingen)
2. Onboarding niet af → `/onboarding` (of `/registreren/plan` als checkout-gate aan)
3. Privacy niet af → `/consent`
4. Paywall **alleen** als `STRUCTURO_MIDDLEWARE_PAYWALL=1` → `/abonnement`
5. Dagstart-cookie guard in middleware is **no-op**; dagstart via `AppLayout` overlay

## Trial en toegang

| Mechanisme | Duur | Bestand |
|------------|------|---------|
| Standaard app-trial | 3 dagen (`created_at`) | `freeTrialAccess.ts` |
| ADHD Café (`signup_source=adhd_cafe`) | 14 dagen | `eventSignupTrialAccess.ts` |
| Launch grace (founding testers) | t/m 30 juni 2026 | `launchGrace.ts` |
| Stripe `active` / `trialing` | per Stripe | webhook sync |

`profileHasAppAccessOrGrace()` is de middleware-check. `trial_expired` status = geen toegang.

`expire_trials()` (SQL) + Vercel Cron `/api/cron/expire-trials` (elke 30 min).

## Analytics

- Client product events: `captureProductEvent` (consent `granted`)
- Server funnel: `captureRegistrationFunnelServer` (signup, checkout)
- First-touch: cookie `st_attr` + sessionStorage (`firstTouchAttribution.ts`)
- Relay PostHog → Supabase: **n8n** (niet in repo)
- `dagstart_started` is **deprecated**; funnel-start = `dagstart_energy_chosen`

## Env (productie)

- `STRUCTURO_MIDDLEWARE_PAYWALL=1` pas na geteste trial-expiry
- `STRUCTURO_PUBLIC_REGISTRATION` uit (geen kaart vóór trial)
- `CRON_SECRET` voor expire-trials cron
