-- Database schema voor StructuroAI MVP
-- Run dit script in je Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (gebruikt Supabase Auth, maar we hebben een profiel tabel nodig)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  priority INTEGER,
  due_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in minuten
  source TEXT, -- 'regular', 'focus_remainder', etc.
  completed_at TIMESTAMP WITH TIME ZONE,
  reminders INTEGER[], -- array van minuten voor due time
  repeat TEXT DEFAULT 'none',
  impact TEXT, -- emoji
  energy_level TEXT, -- 'low', 'medium', 'high'
  estimated_duration INTEGER,
  micro_steps JSONB DEFAULT '[]'::jsonb, -- array van micro-stappen
  not_today BOOLEAN DEFAULT FALSE, -- "niet vandaag" flag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Gamification data table
CREATE TABLE IF NOT EXISTS gamification_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User insights / analytics (optioneel, voor toekomstige features)
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  focus_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, date)
);

-- Daily check-ins (dagstart)
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  energy_level TEXT, -- 'low', 'medium', 'high'
  top3_task_ids UUID[], -- array van task IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, date)
);

-- Daily shutdowns (dagafsluiter)
CREATE TABLE IF NOT EXISTS daily_shutdowns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed_task_ids UUID[], -- taken die af zijn
  moved_to_tomorrow_task_ids UUID[], -- taken naar morgen
  energy_level TEXT, -- 'low', 'medium', 'high'
  reflection TEXT, -- reflectie tekst
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, date)
);

-- Indexes voor betere performance
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_done_idx ON tasks(done);
CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON tasks(due_at);
CREATE INDEX IF NOT EXISTS tasks_user_done_idx ON tasks(user_id, done);
CREATE INDEX IF NOT EXISTS tasks_not_today_idx ON tasks(user_id, not_today);
CREATE INDEX IF NOT EXISTS gamification_data_user_id_idx ON gamification_data(user_id);
CREATE INDEX IF NOT EXISTS user_insights_user_date_idx ON user_insights(user_id, date);
CREATE INDEX IF NOT EXISTS daily_checkins_user_date_idx ON daily_checkins(user_id, date);
CREATE INDEX IF NOT EXISTS daily_shutdowns_user_date_idx ON daily_shutdowns(user_id, date);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_shutdowns ENABLE ROW LEVEL SECURITY;

-- Policies: gebruikers kunnen alleen hun eigen data zien/bewerken
-- Drop bestaande policies eerst (als ze al bestaan)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view own gamification data" ON gamification_data;
DROP POLICY IF EXISTS "Users can update own gamification data" ON gamification_data;
DROP POLICY IF EXISTS "Users can insert own gamification data" ON gamification_data;
DROP POLICY IF EXISTS "Users can view own insights" ON user_insights;
DROP POLICY IF EXISTS "Users can insert own insights" ON user_insights;
DROP POLICY IF EXISTS "Users can update own insights" ON user_insights;
DROP POLICY IF EXISTS "Users can view own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can insert own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can update own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can view own shutdowns" ON daily_shutdowns;
DROP POLICY IF EXISTS "Users can insert own shutdowns" ON daily_shutdowns;
DROP POLICY IF EXISTS "Users can update own shutdowns" ON daily_shutdowns;

-- Maak policies aan
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own gamification data" ON gamification_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification data" ON gamification_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification data" ON gamification_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own insights" ON user_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights" ON user_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights" ON user_insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own checkins" ON daily_checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins" ON daily_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins" ON daily_checkins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own shutdowns" ON daily_shutdowns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shutdowns" ON daily_shutdowns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shutdowns" ON daily_shutdowns
  FOR UPDATE USING (auth.uid() = user_id);

-- Function om automatisch een profiel aan te maken bij registratie
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Maak ook gamification data aan
  INSERT INTO public.gamification_data (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger om profiel aan te maken bij nieuwe gebruiker
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function om updated_at automatisch bij te werken
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers voor updated_at (drop eerst als ze bestaan)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_gamification_data_updated_at ON gamification_data;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_gamification_data_updated_at
  BEFORE UPDATE ON gamification_data
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

