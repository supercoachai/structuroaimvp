-- Web Push: één of meer subscriptions per gebruiker (per apparaat/browser-tab endpoint).
-- Edge Functions met service role lezen alle rijen; client schrijft alleen eigen user_id.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users insert own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users update own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users delete own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users select own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
