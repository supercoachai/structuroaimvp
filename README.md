# StructuroAI MVP

Een AI-powered platform voor volwassenen met ADHD-achtige kenmerken. Dit project helpt gebruikers met takenbeheer, planning, focus en gamification.

## Features

- ✅ **Authenticatie & Multi-user Support**: Elke gebruiker heeft zijn eigen data
- ✅ **Takenbeheer**: Slimme takenlijst met prioriteiten en deadlines
- ✅ **Agenda & Planning**: Dagplanner met herinneringen
- ✅ **Focus Modus**: Concentratie hulp met timers
- ✅ **Gamification**: Beloningen, badges en streaks
- ✅ **Dashboard**: Overzicht van voortgang en statistieken

## Database Setup

**BELANGRIJK**: Voordat je de app kunt gebruiken, moet je Supabase instellen. Zie [DATABASE_SETUP.md](./DATABASE_SETUP.md) voor gedetailleerde instructies.

Kort samengevat:
1. Maak een Supabase account aan
2. Maak een nieuw project
3. Run het SQL schema uit `supabase/schema.sql`
4. Voeg environment variables toe aan `.env.local`

## Getting Started

### 1. Installeer dependencies

```bash
npm install
```

### 2. Configureer Supabase

Volg de instructies in [DATABASE_SETUP.md](./DATABASE_SETUP.md) om Supabase in te stellen.

### 3. Maak `.env.local` bestand

```bash
NEXT_PUBLIC_SUPABASE_URL=je-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=je-anon-key

# Optioneel: beschermd testaccount – data wordt nooit gewist tijdens development
NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL=info@structuro.eu
```

### 4. Start de development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) met je browser. Je wordt doorgestuurd naar de login pagina als je nog niet ingelogd bent.

## Project Structuur

```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # API routes voor database operaties
│   ├── login/        # Login/registratie pagina
│   └── ...
├── components/        # React components
├── hooks/            # Custom React hooks (useTasks, etc.)
├── lib/              # Utilities
│   └── supabase/     # Supabase client configuratie
└── contexts/         # React contexts
```

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Supabase** - Database & Authentication
- **Tailwind CSS** - Styling
- **Heroicons** - Icons

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
