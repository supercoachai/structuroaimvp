# Test Database Setup - Lokale Supabase

Deze guide helpt je om Supabase lokaal te draaien voor testing voordat je naar productie gaat.

## Optie 1: Supabase CLI (Lokaal - Aanbevolen)

### Stap 1: Installeer Supabase CLI

```bash
# macOS (met Homebrew)
brew install supabase/tap/supabase

# Of met npm
npm install -g supabase
```

### Stap 2: Login bij Supabase

```bash
supabase login
```

Dit opent je browser om in te loggen.

### Stap 3: Initialiseer Supabase lokaal

```bash
# In de root van je project
supabase init
```

Dit maakt een `supabase/` directory aan met configuratie.

### Stap 4: Start lokale Supabase

```bash
supabase start
```

Dit start:
- PostgreSQL database (lokaal)
- Supabase Studio (localhost:54323)
- API Gateway (localhost:54321)

### Stap 5: Run het schema

```bash
# Run het complete schema
supabase db reset

# Of run alleen de migration
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/schema.sql
```

### Stap 6: Update .env.local voor lokale test

Maak/update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<haal deze op met: supabase status>
```

Haal de anon key op:
```bash
supabase status
```

### Stap 7: Test alles

```bash
npm run dev
```

Test nu:
- ✅ Taak toevoegen
- ✅ Geparkeerde gedachten
- ✅ Alle functionaliteit

### Stap 8: Stop lokale Supabase

```bash
supabase stop
```

---

## Optie 2: Test Project in Supabase Cloud (Eenvoudiger)

### Stap 1: Maak een test project

1. Ga naar [supabase.com](https://supabase.com)
2. Klik op "New Project"
3. Naam: `structuroai-mvp-test`
4. Wacht tot het project klaar is

### Stap 2: Run het schema

1. Ga naar SQL Editor
2. Open `supabase/schema.sql`, kopieer en plak alles, klik "Run"
3. Open daarna `supabase/migration_app_columns.sql`, kopieer en plak, klik "Run" (extra kolommen voor taken)

### Stap 3: Test met test project

Update `.env.local` tijdelijk:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jouw-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-project-anon-key
```

### Stap 4: Test alles

```bash
npm run dev
```

Test alle functionaliteit. **Testgebruikers:** elke gebruiker die inlogt (Supabase Auth) krijgt automatisch een eigen omgeving: taken en dagstart-check-ins worden opgeslagen op `user_id`. Zonder inloggen kun je "Doorgaan met lokale data" kiezen op de loginpagina (data in localStorage).

### Stap 5: Terug naar productie

Update `.env.local` terug naar productie credentials.

---

## Na Testing: Schema naar Productie

Als alles werkt in test, run dan op productie:

1. Ga naar je **productie** Supabase project
2. SQL Editor → New Query
3. Open `supabase/migration_complete_schema.sql`
4. Kopieer en plak
5. Klik "Run"
6. Controleer of alles werkt

---

## Troubleshooting

### "Could not find column" errors

Run de migration script:
```sql
-- In Supabase SQL Editor
-- Run: supabase/migration_complete_schema.sql
```

### Lokale Supabase start niet

```bash
# Reset alles
supabase stop
supabase start --ignore-health-check
```

### Port conflicts

Supabase gebruikt:
- 54321 (API)
- 54322 (Postgres)
- 54323 (Studio)

Zorg dat deze poorten vrij zijn.

