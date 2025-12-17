# Test Project Setup - Stap voor Stap

## Stap 1: Maak Test Project in Supabase

1. Ga naar [https://supabase.com](https://supabase.com)
2. Log in met je account
3. Klik op **"New Project"** (of "Create new project")
4. Vul in:
   - **Project Name**: `structuroai-mvp-test` (of een andere naam)
   - **Database Password**: Kies een sterk wachtwoord (bewaar dit!)
   - **Region**: Kies de dichtstbijzijnde regio (bijv. `West EU (Ireland)`)
5. Klik op **"Create new project"**
6. Wacht 2-3 minuten tot het project klaar is

## Stap 2: Run het Complete Schema

1. In je Supabase Dashboard, klik op **"SQL Editor"** in het linker menu
2. Klik op **"New query"**
3. Open het bestand `supabase/schema.sql` in dit project
4. **Kopieer de volledige inhoud** (Cmd+A, Cmd+C)
5. **Plak het in de SQL Editor** (Cmd+V)
6. Klik op **"Run"** (of druk op Cmd/Ctrl + Enter)
7. Controleer of er **geen errors** zijn (groene checkmark)

## Stap 3: Haal Test Project Credentials Op

1. In je Supabase Dashboard, ga naar **"Settings"** → **"API"**
2. Je ziet daar:
   - **Project URL** (bijv. `https://xxxxx.supabase.co`)
   - **anon/public key** (een lange string)
3. **Kopieer beide waarden** - je hebt ze straks nodig

## Stap 4: Backup Huidige .env.local (Belangrijk!)

Voordat we overschakelen naar test, maak een backup:

```bash
# In je terminal, in de project root:
cp .env.local .env.local.backup
```

## Stap 5: Update .env.local voor Test

Open `.env.local` en vervang de waarden met je **test project** credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jouw-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-project-anon-key-hier
```

**Let op**: Vervang met de echte waarden van je test project!

## Stap 6: Test Alles

1. Start de development server:
```bash
npm run dev
```

2. Test de volgende functionaliteiten:
   - ✅ Login/Registratie
   - ✅ Taak toevoegen (dit was het probleem!)
   - ✅ Geparkeerde gedachten
   - ✅ Takenlijst
   - ✅ Focus Modus
   - ✅ Alle andere features

3. Als alles werkt → **SUCCES!** ✅
4. Als er nog errors zijn → noteer ze en we fixen ze

## Stap 7: Terug naar Productie

Als alles werkt in test:

1. **Herstel je productie .env.local**:
```bash
cp .env.local.backup .env.local
```

2. **Ga naar je PRODUCTIE Supabase project**
3. **SQL Editor** → **New Query**
4. Open `supabase/migration_complete_schema.sql`
5. Kopieer en plak alles
6. Klik **"Run"**
7. Test op productie opnieuw

## Stap 8: Cleanup (Optioneel)

Je kunt het test project later verwijderen als je wilt:
- Ga naar Project Settings → General → Delete Project

---

## Troubleshooting

### "Could not find column" errors
- Run `supabase/migration_complete_schema.sql` in plaats van alleen `schema.sql`

### Login werkt niet
- Check of je de juiste credentials hebt in `.env.local`
- Check of email verificatie aan staat in Supabase

### Andere errors?
- Check de browser console (F12)
- Check de terminal output
- Noteer de exacte error message

