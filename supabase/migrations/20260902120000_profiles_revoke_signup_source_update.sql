-- P0: authenticated mag signup_source / signup_utm_campaign niet meer zelf
-- updaten (self-grant van event-trial). First-touch blijft via handle_new_user
-- (auth metadata bij signup) en auth-callback (service_role). gift_comp mag
-- nooit uit user_metadata komen.

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  display_name,
  preferred_name,
  email,
  onboarding_completed,
  onboarding_version,
  last_dagstart_date,
  dagstart_energy,
  dagstart_completed_at,
  dismissed_info_keys,
  cycle_tracking_consent_at,
  cycle_last_period_start,
  cycle_average_length,
  cycle_menstruation_duration,
  last_seen_at
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  src text;
  campaign text;
BEGIN
  src := NULLIF(TRIM(NEW.raw_user_meta_data->>'signup_source'), '');
  campaign := NULLIF(TRIM(NEW.raw_user_meta_data->>'signup_utm_campaign'), '');

  IF lower(src) = 'gift_comp' THEN
    src := NULL;
    campaign := NULL;
  END IF;

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
    src,
    campaign
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
