# Founding Members – Testomgeving opzetten

Deze gids beschrijft wat nodig is om founding members de app te laten testen.

---

## Optie A: Één gedeelde testomgeving (aanbevolen)

Alle founding members testen op **dezelfde URL** met ieder een **eigen account**. Dit is het meest eenvoudig.

### Wat je nodig hebt

1. **GitHub-repository** – Code staat in een repo (bv. `structuroai-mvp`)
2. **Supabase-project** – Voor authenticatie (één gedeeld project)
3. **Vercel-account** – Voor hosting (gratis tier voldoet)

### Stappen

#### 1. Supabase-project

1. Ga naar [supabase.com](https://supabase.com)
2. Maak een nieuw project (of gebruik bestaande)
3. Voer het schema uit: **SQL Editor** → plak inhoud van `supabase/schema.sql` → Run
4. Ga naar **Settings → API**:
   - Kopieer **Project URL**
   - Kopieer **anon public** key

#### 2. Redirect URLs in Supabase

1. Ga naar **Authentication → URL Configuration**
2. Voeg toe aan **Redirect URLs**:
   - `https://jouw-domein.vercel.app/auth/callback`
   - `https://jouw-domein.vercel.app/**`
   - (Vervang `jouw-domein` door je echte Vercel-URL)

#### 3. Deploy naar Vercel

1. Ga naar [vercel.com](https://vercel.com)
2. **Add New Project** → importeer je GitHub-repo
3. **Environment Variables** toevoegen:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
4. **Deploy**

#### 4. Test-accounts aanmaken

1. Open de live-URL (bv. `https://structuro-mvp.vercel.app`)
2. Founding members klikken op **“Maak er een aan”** op de loginpagina
3. Ze registreren met hun eigen e‑mail en wachtwoord
4. Supabase Auth maakt automatisch een account per persoon

### Wat founding members krijgen

- Eigen login-gegevens  
- Eigen sessie (iedereen blijft op zijn eigen account)  
- Taken staan lokaal in de browser (per device/browser)

> **Let op:** Taken worden nu in de browser opgeslagen (localStorage). Ze blijven dus beperkt tot dat apparaat en die browser. Voor echte data-sync over devices zou een latere migratie naar Supabase nodig zijn.

---

## Optie B: Eigen omgeving per founding member

Als je per persoon een **aparte deployment** wilt (bv. `member1.structuro.app`, `member2.structuro.app`):

### Per persoon nodig

- Eigen Supabase-project (of aparte schema’s in één project)
- Eigen Vercel-project of aparte branch + preview-URL
- Eigen set environment variables

Dit is meer werk en alleen zinvol als je strikt gescheiden testdata wilt.

---

## Checklist voor jou

- [ ] Supabase-project aangemaakt
- [ ] `supabase/schema.sql` uitgevoerd
- [ ] Redirect URLs in Supabase ingesteld
- [ ] Vercel-deploy succesvol
- [ ] Environment variables correct ingesteld
- [ ] Eerste testaccount aangemaakt en ingelogd

---

## Testlink naar founding members

Zodra de deploy draait:

1. Stuur de live URL (bv. `https://structuro-mvp.vercel.app`)
2. Instructie: *“Klik op ‘Maak er een aan’ en registreer met je e-mail.”*
3. De **“Doorgaan met lokale data”**-optie blijft beschikbaar als iemand niet kan inloggen

---

## Handige commando’s

```bash
# Lokaal build testen (voordat je deployt)
npm run build

# Snel deployen met Vercel CLI
npx vercel --prod
```

---

## Mogelijke problemen

| Probleem | Oplossing |
|----------|-----------|
| Kan niet inloggen | Controleer Redirect URLs in Supabase + environment variables in Vercel |
| “Invalid credentials” | Wachtwoord moet minimaal 6 tekens zijn |
| Email niet bevestigd | In Supabase: Authentication → Providers → Email → schakel “Confirm email” uit voor snelle tests |
| Build faalt op Vercel | Controleer build logs; vaak ontbrekende env-vars of TypeScriptfouten |
