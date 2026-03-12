# Testgebruikers + deploy op Vercel

Zo zet je testgebruikers aan het werk en deploy je Structuro naar Vercel.

---

## 1. Testgebruikers toevoegen

### Optie A: Zelf laten registreren (meest eenvoudig)

Testgebruikers gaan naar je app (lokaal of Vercel-URL), klikken op **Registreren**, vullen e-mail + wachtwoord in en kunnen direct inloggen. Geen actie in Supabase nodig.

- In **Supabase Dashboard** → **Authentication** → **Providers**: zorg dat **Email** aan staat.
- Optioneel: onder **Authentication** → **Email Templates** kun je "Confirm signup" uitzetten voor test (geen e-mailverificatie): in **Project Settings** → **Auth** → "Confirm email" uit.

### Optie B: Handmatig users toevoegen in Supabase

1. Ga in Supabase naar **Authentication** → **Users**.
2. Klik **Add user** → **Create new user**.
3. Vul **Email** en **Password** in (en eventueel naam).
4. Klik **Create user**.
5. Deel met de tester: e-mailadres + wachtwoord; ze loggen in op de loginpagina van je app.

---

## 2. Deploy op Vercel

### Stap 1: Project op Vercel

1. Ga naar [vercel.com](https://vercel.com) en log in (bijv. met GitHub).
2. **Add New** → **Project** en kies je repo (structuroai-mvp).
3. Framework: **Next.js** (wordt meestal automatisch herkend).
4. Klik **Deploy** (eerst zonder env vars kan ook).

### Stap 2: Omgevingsvariabelen op Vercel

1. In je Vercel-project: **Settings** → **Environment Variables**.
2. Voeg toe:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Je Supabase project URL (bijv. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Je Supabase anon key |

3. Kies **Production** (en eventueel Preview) en sla op.
4. **Redeploy** het project (Deployments → ⋮ bij laatste deploy → Redeploy), zodat de nieuwe variabelen worden meegenomen.

### Stap 3: Supabase URLs instellen

Zodat inloggen en eventuele redirects naar jouw app gaan:

1. Supabase Dashboard → **Authentication** → **URL Configuration**.
2. **Site URL**: zet op je Vercel-URL, bijv. `https://jouw-project.vercel.app`.
3. **Redirect URLs**: voeg dezelfde URL toe, bijv. `https://jouw-project.vercel.app/**` (of in ieder geval `https://jouw-project.vercel.app/auth/callback`).

Opslaan. Daarna kunnen testers op die Vercel-URL inloggen en testen.

---

## Samenvatting

| Wat | Waar |
|-----|------|
| E-mailadressen toevoegen | Supabase → Authentication → Users (of laten registreren in de app). |
| Koppelen | Gebruikers loggen in met dat e-mailadres + wachtwoord; Supabase koppelt sessie aan `user_id`; taken en dagstart zijn per user. |
| Vercel | Deploy vanuit GitHub; env vars `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` instellen; daarna Supabase Site URL + Redirect URL op de Vercel-URL zetten. |

Daarna kunnen testgebruikers op de Vercel-URL inloggen en testen met hun eigen data.
