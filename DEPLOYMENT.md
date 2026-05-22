# Deployment Guide - Structuro MVP

## 🚀 Snelle Deployment op Vercel (Aanbevolen - ~10 minuten)

### Stap 1: Voorbereiding
1. Zorg dat je code gepusht is naar GitHub (of maak een nieuwe repo aan)
2. Zorg dat je Supabase project klaar is en het schema is gerund

### Stap 2: Vercel Account
1. Ga naar [vercel.com](https://vercel.com)
2. Log in met GitHub
3. Klik op "Add New Project"

### Stap 3: Project Importeren
1. Selecteer je GitHub repository
2. Vercel detecteert automatisch Next.js
3. Klik op "Deploy"

### Stap 4: Environment Variables Toevoegen
**BELANGRIJK**: Voeg deze environment variables toe in Vercel:

1. Ga naar je project settings → Environment Variables
2. Voeg toe:
   - `NEXT_PUBLIC_SUPABASE_URL` = je Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = je Supabase anon key

Je vindt deze in Supabase:
- Ga naar je project → Settings → API
- Copy de "Project URL" en "anon public" key

### Stap 5: Deploy
1. Na het toevoegen van environment variables, ga naar "Deployments"
2. Klik op de 3 dots van de laatste deployment → "Redeploy"
3. Wacht ~2 minuten

### Stap 6: Test
1. Je krijgt een URL zoals: `https://jouw-project.vercel.app`
2. Test de login functionaliteit
3. Test of data wordt opgeslagen

---

## 🔧 Alternatief: Andere Hosting Opties

### Netlify
1. Ga naar [netlify.com](https://netlify.com)
2. Import from Git → Selecteer je repo
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Voeg environment variables toe (zelfde als Vercel)

### Railway
1. Ga naar [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Selecteer je repo
4. Railway detecteert Next.js automatisch
5. Voeg environment variables toe in Variables tab

---

## ✅ Pre-Deployment Checklist

- [ ] Code is gepusht naar GitHub
- [ ] Supabase project is aangemaakt
- [ ] Database schema is gerund (`supabase/schema.sql`)
- [ ] Environment variables zijn bekend
- [ ] Build werkt lokaal (`npm run build`)
- [ ] Login functionaliteit werkt lokaal

---

## 🐛 Troubleshooting

### Build Fails
- Check of alle dependencies geïnstalleerd zijn
- Check of TypeScript errors zijn opgelost
- Check Vercel build logs voor specifieke errors

### Environment Variables Not Working
- Zorg dat variabelen beginnen met `NEXT_PUBLIC_` voor client-side
- Check of variabelen correct zijn gespeld
- Redeploy na het toevoegen van variabelen

### Database Connection Issues
- Check of Supabase URL en key correct zijn
- Check of Row Level Security policies zijn ingesteld
- Check Supabase logs voor errors

### Authentication Not Working
- Check of Supabase Auth is ingeschakeld
- Check of redirect URLs zijn geconfigureerd in Supabase
- Voeg je Vercel URL toe aan Supabase → Authentication → URL Configuration

---

## 📝 Supabase Redirect URLs Configureren

1. Ga naar Supabase Dashboard → Authentication → URL Configuration
2. Voeg toe aan "Redirect URLs":
   - `https://jouw-project.vercel.app/auth/callback`
   - `https://jouw-project.vercel.app/**`

---

## 🎯 Na Deployment

1. Test alle functionaliteiten:
   - [ ] Login/Registratie
   - [ ] Taken toevoegen
   - [ ] Agenda items
   - [ ] Focus modus

2. Check console voor errors (F12 in browser)

3. Monitor Vercel logs voor server-side errors

---

## ⚡ Quick Deploy Command (als je Vercel CLI hebt)

```bash
npm i -g vercel
vercel login
vercel --prod
```

Volg de prompts en voeg environment variables toe.

---

## 🔒 Registratie + Stripe verbergen (pre-launch)

Standaard zijn `/registreren`, `/welkom`, `/abonnement` en checkout-API's **niet bereikbaar** op productie. Bezoekers worden doorgestuurd naar `/login`. Het abonnementsblok in Instellingen is verborgen.

| Variabele | Wanneer |
|-----------|---------|
| *(niet zetten)* | **Pre-launch push**: laat beide variabelen weg op Vercel |
| `STRUCTURO_PUBLIC_REGISTRATION=1` | Server/middleware: registratie-routes open |
| `NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION=1` | Client: Instellingen-abonnement + registratie-UI |

Lokaal (`next dev`): registratie staat **aan** tenzij je `STRUCTURO_PUBLIC_REGISTRATION=0` en `NEXT_PUBLIC_STRUCTURO_PUBLIC_REGISTRATION=0` zet.

Webhook (`/api/stripe/webhook`) blijft bereikbaar voor wanneer je later live gaat; gebruikers zien geen Stripe-UI.

---

## 💳 Stripe live launch (Model B: signup → app → betalen)

Flow: gebruiker registreert, gebruikt de app, betaalt via `/abonnement`. Geen guest checkout, geen Stripe Trial.

### Vercel environment variables (live)

| Variabele | Waarde / opmerking |
|-----------|-------------------|
| `STRIPE_SECRET_KEY` | Live secret key (`sk_live_…`), niet test |
| `STRIPE_WEBHOOK_SECRET` | **Live** webhook signing secret uit Stripe Dashboard → Developers → Webhooks (endpoint op jouw productie-URL). Niet de sandbox secret hergebruiken. |
| `STRIPE_PRICE_ID_MONTHLY` | `price_1TZpgcV05ARLhkqludSsZ0P5` |
| `STRIPE_PRICE_ID_YEARLY` | `price_1TZpgeV05ARLhkqluF7sX6EZ` |
| `SUPABASE_SERVICE_ROLE_KEY` | Voor checkout prior-refund check en webhook profile updates |
| `STRUCTURO_MIDDLEWARE_PAYWALL` | `1` pas zetten wanneer je hard paywall wilt (zie middleware). Standaard uit. |

Prijzen staan op `tax_behavior: inclusive` (€12,99 / €119 all-in voor de klant). Geen Stripe Tax (`automatic_tax`) in MVP.

### Stripe Dashboard

- [ ] Webhook endpoint: `https://<jouw-domein>/api/stripe/webhook` (live mode)
- [ ] Events: o.a. `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`, `charge.refunded`
- [ ] **Customer Portal** aan (Settings → Billing → Customer Portal) voor self-service opzeggen
- [ ] Migratie `supabase/migration_stripe_subscription.sql` gedraaid op productie-DB

### PostHog error smoke-test (preview, vóór 31 mei)

- `POSTHOG_TEST_ENDPOINT=true` + `POSTHOG_ERROR_TEST_SECRET=<random>` alleen op preview
- Eén keer: `GET /api/posthog-error-test?secret=…`
- Daarna flag uit of route verwijderen

### Paywall inschakelen

Middleware redirect naar `/abonnement` staat achter `STRUCTURO_MIDDLEWARE_PAYWALL=1`. Geef bestaande testers eerst een grace-period (handmatig `subscription_status` of tijdelijk paywall uit) vóór je dit op productie zet.

---

**Veel succes met je deployment! 🚀**

