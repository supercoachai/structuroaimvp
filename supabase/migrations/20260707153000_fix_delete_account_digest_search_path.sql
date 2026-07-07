-- pgcrypto staat in Supabase op schema `extensions`, niet in `public`.
-- delete_account_data had SET search_path = public waardoor digest() ontbrak
-- (Vercel-log: "function digest(text, unknown) does not exist").

CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM tasks                         WHERE user_id = p_user_id;
  DELETE FROM daily_checkins                WHERE user_id = p_user_id;
  DELETE FROM daily_shutdowns               WHERE user_id = p_user_id;
  DELETE FROM parked_thoughts               WHERE user_id = p_user_id;
  DELETE FROM user_insights                 WHERE user_id = p_user_id;
  DELETE FROM push_subscriptions            WHERE user_id = p_user_id;
  DELETE FROM shutdown_reminder_sends       WHERE user_id = p_user_id;
  DELETE FROM daystart_reminder_sends       WHERE user_id = p_user_id;
  DELETE FROM daystart_lunch_reminder_sends WHERE user_id = p_user_id;
  DELETE FROM ai_daily_usage                WHERE user_id = p_user_id;

  UPDATE analytics_events SET user_id = NULL WHERE user_id = p_user_id;

  DELETE FROM profiles                      WHERE id      = p_user_id;

  INSERT INTO account_deletion_audit (user_id_hash)
  VALUES (encode(extensions.digest(p_user_id::text, 'sha256'), 'hex'));
END;
$$;
