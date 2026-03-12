# Vercel deploy – stap voor stap

Volg deze stappen om Structuro op Vercel te zetten.

---

## Voor je begint

- Je code staat op **GitHub** (repo heet bijv. `structuroai-mvp`).
- Je hebt je **Supabase URL** en **anon key** bij de hand (uit Supabase Dashboard → Project Settings → API).

---

## Stap 1: Ga naar Vercel

1. Open **https://vercel.com** in je browser.
2. Log in (of maak een account) met **GitHub**.
3. Geef Vercel toegang tot je GitHub als dat gevraagd wordt.

---

## Stap 2: Nieuw project maken

1. Klik op **"Add New..."** → **"Project"**.
2. Je ziet een lijst met je GitHub-repos. Zoek **structuroai-mvp** (of de naam van je repo).
3. Klik rechts naast die repo op **"Import"**.

---

## Stap 3: Projectinstellingen (meestal zo laten)

- **Framework Preset:** Next.js (staat er meestal al).
- **Root Directory:** leeg laten (tenzij je project in een submap zit).
- **Build Command:** `next build` (standaard).
- **Output Directory:** standaard (leeg of `.next`).
- **Install Command:** `npm install` (standaard).

Klik nog **niet** op Deploy – eerst de env vars zetten.

---

## Stap 4: Omgevingsvariabelen toevoegen

1. Op dezelfde pagina, scroll naar **"Environment Variables"**.
2. Klik op het veld **Name** en vul in:  
   `NEXT_PUBLIC_SUPABASE_URL`
3. Bij **Value** plak je je Supabase project URL, bijv.:  
   `https://abcdefghijk.supabase.co`  
   (haal deze uit Supabase → Project Settings → API → Project URL)
4. Klik **"Add"** of **"Add another"**.
5. Voeg de tweede variabele toe:
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** je Supabase anon key (Project Settings → API → Project API keys → `anon` public)
6. Zet bij beide variabelen het vinkje op **Production** (en eventueel **Preview**).
7. Klik onderaan op **"Deploy"**.

---

## Stap 5: Wachten op de build

- De eerste deploy duurt meestal 1–3 minuten.
- Als het goed is, zie je onderaan **"Congratulations!"** of **"Your project has been deployed"**.
- Klik op **"Visit"** of op de link (bijv. `https://structuroai-mvp.vercel.app`) om je site te openen.

---

## Stap 6: Supabase URLs instellen

Zodat inloggen op de live site werkt:

1. Ga naar **Supabase Dashboard** → je project.
2. Links: **Authentication** → **URL Configuration**.
3. **Site URL:** vervang door je Vercel-URL, bijv.:  
   `https://structuroai-mvp.vercel.app`
4. Bij **Redirect URLs** staat vaak al `http://localhost:3000/**`. Klik **"Add URL"** en voeg toe:  
   `https://structuroai-mvp.vercel.app/**`  
   (vervang door jouw echte Vercel-URL).
5. Klik **Save**.

---

## Stap 7: Testen

1. Open je Vercel-URL in een browser (bijv. `https://structuroai-mvp.vercel.app`).
2. Je zou naar de loginpagina moeten gaan (of naar home, afhankelijk van je flow).
3. Test **Registreren** met een e-mail + wachtwoord.
4. Na inloggen: taken en dagstart moeten werken; data staat in Supabase per user.

---

## Als je later iets wijzigt

- **Alleen code:** push naar GitHub → Vercel maakt automatisch een nieuwe deploy (duurt 1–3 min).
- **Env vars gewijzigd:** Vercel → je project → **Settings** → **Environment Variables** → aanpassen → bij **Deployments** de laatste deploy op **Redeploy** zetten.

---

## Korte checklist

| Stap | Wat |
|------|-----|
| 1 | vercel.com, inloggen met GitHub |
| 2 | Add New → Project → repo importeren |
| 3 | Instellingen laten staan (Next.js) |
| 4 | `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` invullen → Deploy |
| 5 | Wachten op build, dan Visit |
| 6 | Supabase → Authentication → URL Configuration → Site URL + Redirect URL op Vercel-URL zetten |
| 7 | Inloggen op de live URL testen |

Daarna kunnen testers op je Vercel-URL inloggen en de app gebruiken.
