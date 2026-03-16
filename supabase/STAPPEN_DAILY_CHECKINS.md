# Stappen: Dagstart (daily_checkins) in Supabase

Volg deze stappen zodat Dagstart-data in Supabase wordt opgeslagen in plaats van lokaal.

---

## Stap 1: Supabase Dashboard openen

1. Ga naar [https://supabase.com/dashboard](https://supabase.com/dashboard) en log in.
2. Open je **project** (structuroai-mvp of hoe je project heet).

---

## Stap 2: SQL Editor openen

1. In het linkermenu: klik op **SQL Editor**.
2. Klik op **New query** (nieuwe query).

---

## Stap 3: Migratie uitvoeren

1. Open in je project het bestand:  
   **`supabase/migration_daily_checkins.sql`**
2. Kopieer de **volledige inhoud** van dat bestand.
3. Plak de inhoud in het query-veld in de Supabase SQL Editor.
4. Klik op **Run** (of Ctrl/Cmd + Enter).

Als het goed is, zie je onderaan: **Success. No rows returned.**

---

## Stap 4: Controleren of de tabel bestaat

1. In het linkermenu: klik op **Table Editor**.
2. In de lijst met tabellen zou je **`daily_checkins`** moeten zien.
3. Klik erop en controleer de kolommen:  
   `id`, `user_id`, `date`, `energy_level`, `top3_task_ids`, `created_at`.

---

## Stap 5: Testen in de app

1. Start je app (lokaal of deployment).
2. Log in met een gebruiker die bij Supabase hoort.
3. Ga naar **Dagstart**, vul energie en eventueel top 3 in en sla op.
4. In Supabase: **Table Editor** → **daily_checkins** → ververs de view.  
   Er zou nu een rij moeten staan voor vandaag met jouw `user_id`.

---

## Als er iets misgaat

- **Fout “relation already exists”**  
  De tabel bestaat al. Je hoeft de migratie niet opnieuw te draaien; de app kan gewoon gebruiken wat er staat.

- **Fout over `uuid_generate_v4()`**  
  Voer eerst uit:  
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`  
  Daarna opnieuw de migratie runnen.

- **Fout bij `top3_task_ids` (type UUID[])**  
  Als je taak-ids geen echte UUIDs zijn, kan de migratie kolom `top3_task_ids` als `TEXT[]` aanmaken. Vraag in dat geval om een aangepaste migratie.

- **RLS (Row Level Security)**  
  De migratie zet RLS aan en maakt policies zodat gebruikers alleen hun eigen check-ins kunnen lezen/schrijven. Na deze stappen hoef je daar niets meer voor te doen.

---

Na deze stappen worden nieuwe Dagstart-opslagacties in Supabase gedaan en niet meer lokaal.
