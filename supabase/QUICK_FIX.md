# Quick Fix: Database Updaten

## Stap 1: Ga naar je Supabase Dashboard

1. Ga naar [supabase.com](https://supabase.com)
2. Log in
3. Selecteer je **bestaande project** (niet een nieuwe maken!)

## Stap 2: Run de Migration

1. Klik op **"SQL Editor"** in het linker menu
2. Klik op **"New query"**
3. Open het bestand `supabase/migration_complete_schema.sql` in dit project
4. **Kopieer de volledige inhoud** (Cmd+A, Cmd+C)
5. **Plak het in de SQL Editor** (Cmd+V)
6. Klik op **"Run"** (of druk op Cmd/Ctrl + Enter)

## Stap 3: Controleer Resultaat

Je zou moeten zien:
- ✓ micro_steps kolom toegevoegd (of bestaat al)
- ✓ not_today kolom toegevoegd (of bestaat al)
- ✓ source kolom toegevoegd (of bestaat al)
- ✓ energy_level kolom toegevoegd (of bestaat al)
- ✓ estimated_duration kolom toegevoegd (of bestaat al)

Onderaan zie je een tabel met alle kolommen van de tasks tabel.

## Stap 4: Test

1. Start je app: `npm run dev`
2. Probeer een taak toe te voegen
3. Het zou nu moeten werken! ✅

---

**Dat is het!** Geen test project nodig, gewoon direct updaten. 🚀

