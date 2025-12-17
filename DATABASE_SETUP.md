# Database Setup Instructies

Deze guide helpt je om Supabase in te stellen voor de StructuroAI MVP zodat 50 testers hun eigen data kunnen hebben.

## Stap 1: Supabase Account Aanmaken

1. Ga naar [https://supabase.com](https://supabase.com)
2. Maak een gratis account aan (of log in)
3. Klik op "New Project"

## Stap 2: Project Aanmaken

1. **Project Name**: `structuroai-mvp` (of een andere naam)
2. **Database Password**: Kies een sterk wachtwoord (bewaar dit!)
3. **Region**: Kies de dichtstbijzijnde regio (bijv. `West EU (Ireland)`)
4. Klik op "Create new project"
5. Wacht 2-3 minuten tot het project klaar is

## Stap 3: Database Schema Installeren

1. Ga naar je Supabase project dashboard
2. Klik op "SQL Editor" in het linker menu
3. Klik op "New query"
4. Open het bestand `supabase/schema.sql` in dit project
5. Kopieer de volledige inhoud
6. Plak het in de SQL Editor
7. Klik op "Run" (of druk op Cmd/Ctrl + Enter)
8. Controleer of er geen errors zijn

## Stap 4: Environment Variables Instellen

1. In je Supabase dashboard, ga naar "Settings" → "API"
2. Je ziet daar:
   - **Project URL** (bijv. `https://xxxxx.supabase.co`)
   - **anon/public key** (een lange string)

3. Maak een bestand `.env.local` in de root van je project:

```bash
NEXT_PUBLIC_SUPABASE_URL=je-project-url-hier
NEXT_PUBLIC_SUPABASE_ANON_KEY=je-anon-key-hier
```

**Let op**: Vervang de waarden met je eigen Supabase credentials!

## Stap 5: Email Verificatie Instellen (Optioneel)

Voor productie wil je waarschijnlijk email verificatie aanzetten:

1. Ga naar "Authentication" → "Providers" in Supabase
2. Zorg dat "Email" provider aan staat
3. Ga naar "Authentication" → "URL Configuration"
4. Voeg toe:
   - **Site URL**: `http://localhost:3000` (voor development)
   - **Redirect URLs**: `http://localhost:3000/auth/callback`

Voor productie voeg je je productie URL toe.

## Stap 6: Test de Setup

1. Start de development server: `npm run dev`
2. Ga naar `http://localhost:3000/login`
3. Maak een test account aan
4. Controleer of je ingelogd bent en taken kunt aanmaken

## Stap 7: Productie Setup (Wanneer klaar voor testers)

1. Deploy je Next.js app (bijv. Vercel)
2. Voeg environment variables toe in je hosting platform
3. Update Supabase redirect URLs met je productie URL
4. Test opnieuw met een nieuw account

## Troubleshooting

### "Unauthorized" errors
- Controleer of je environment variables correct zijn ingesteld
- Controleer of RLS (Row Level Security) policies correct zijn ingesteld in de database

### Email verificatie werkt niet
- Check je email spam folder
- In development kun je email verificatie uitzetten voor snellere testing
- Ga naar "Authentication" → "Providers" → "Email" → "Confirm email" uitzetten

### Database errors
- Controleer of het schema correct is geïnstalleerd
- Check de Supabase logs in het dashboard

## Belangrijke Notities

- **Gratis tier**: Supabase gratis tier ondersteunt tot 500MB database en 2GB bandwidth - genoeg voor 50 testers
- **Backups**: Zorg dat je regelmatig backups maakt via Supabase dashboard
- **Monitoring**: Gebruik Supabase dashboard om gebruik te monitoren
- **Security**: RLS policies zorgen ervoor dat gebruikers alleen hun eigen data kunnen zien

## Support

Als je problemen hebt:
1. Check de Supabase logs in het dashboard
2. Check de browser console voor errors
3. Check de Next.js terminal output

