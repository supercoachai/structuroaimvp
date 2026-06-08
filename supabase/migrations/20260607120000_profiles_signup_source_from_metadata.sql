-- Zet signup_source direct bij profiel-aanmaak (uit auth user_metadata), zodat event-trials
-- (bijv. adhd_cafe → 14 dagen) niet verloren gaan door een race na client-side update.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    signup_source,
    signup_utm_campaign
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'signup_source'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'signup_utm_campaign'), '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
