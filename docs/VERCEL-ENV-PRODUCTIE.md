# Vercel Production — Environment Variables

Plak dit in: **Vercel → Project → Settings → Environment Variables → Production**

Zet elk item op scope **Production** (niet Preview, niet Development).

---

## 1. Stripe Live Keys (jij vult de waarden in)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

→ `sk_live_…`: Stripe Dashboard → Developers → API keys → **Live mode** → Secret key  
→ `whsec_…`: Stripe Dashboard → Developers → Webhooks → jouw live webhook → Signing secret

---

## 2. Stripe Live Price IDs (exact, al ingevuld)

```
STRIPE_PRICE_ID_MONTHLY=price_1TZpgcV05ARLhkqludSsZ0P5
STRIPE_PRICE_ID_YEARLY=price_1TZpgeV05ARLhkqluF7sX6EZ
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_1TZpgcV05ARLhkqludSsZ0P5
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_1TZpgeV05ARLhkqluF7sX6EZ
```

---

## 3. Supabase (jij vult de waarden in)

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

→ Supabase Dashboard → Project Settings → API → **service_role** (niet de anon key!)

De volgende twee staan waarschijnlijk al goed; controleer:
```
NEXT_PUBLIC_SUPABASE_URL=https://oapnsywlmdmqgmfwiojy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_AG_TDX2qzKKftEycSHg-FA_b4VR3cms
```

---

## 4. Launch Flags (direct copy-paste, geen aanpassing nodig)

```
STRUCTURO_PUBLIC_REGISTRATION=1
NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION=1
STRUCTURO_MIDDLEWARE_PAYWALL=0
```

> `STRUCTURO_MIDDLEWARE_PAYWALL=0` = bestaande testers blijven werken zonder Stripe.
> Na de eerste launch-week kun je dit op `1` zetten.

---

## 5. PostHog (controleren, niet wijzigen tenzij afwezig)

```
NEXT_PUBLIC_POSTHOG_KEY=phx_...
```

Zorg dat dit **NIET** aanwezig is op Production:
```
NEXT_PUBLIC_POSTHOG_DEBUG=true      ← weghalen als het er staat
POSTHOG_TEST_ENDPOINT=true          ← weghalen als het er staat
POSTHOG_ERROR_TEST_SECRET=...       ← weghalen als het er staat
```

---

## 6. Expliciet verboden op Production

| Waarde | Reden |
|--------|-------|
| `sk_test_…` | Laadt test-Stripe, betalingen gaan nergens heen |
| `price_1TZr2…` of `price_1TZr35…` | Test price IDs, Stripe gooit een error met live key |
| `NEXT_PUBLIC_POSTHOG_DEBUG=true` | Stuurt geen events naar PostHog EU |

---

## Checklist na invullen

- [ ] `STRIPE_SECRET_KEY` begint met `sk_live_`
- [ ] `STRIPE_WEBHOOK_SECRET` begint met `whsec_`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is de service_role, niet de anon key
- [ ] Price IDs zijn de `price_1TZpgc…` en `price_1TZpge…` variants (live)
- [ ] `STRUCTURO_PUBLIC_REGISTRATION=1` staat op Production
- [ ] Geen test-varianten aanwezig
