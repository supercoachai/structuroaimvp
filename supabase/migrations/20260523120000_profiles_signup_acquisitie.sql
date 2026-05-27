-- Acquisitie: waar komt een account vandaan (UTM bij signup)?
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_source TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_utm_campaign TEXT;

COMMENT ON COLUMN public.profiles.signup_source IS
  'Eerste-touch kanaal bij account-aanmaak (utm_source of source), bijv. linkedin, tiktok, direct.';

COMMENT ON COLUMN public.profiles.signup_utm_campaign IS
  'Optionele utm_campaign bij signup, bijv. post2_amnestisch.';

CREATE INDEX IF NOT EXISTS profiles_signup_source_idx
  ON public.profiles (signup_source)
  WHERE signup_source IS NOT NULL;

CREATE OR REPLACE VIEW public.acquisitie_conversie
WITH (security_invoker = true) AS
SELECT
  signup_source,
  COUNT(*) AS signups,
  COUNT(*) FILTER (WHERE subscription_status = 'active') AS betaald,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE subscription_status = 'active')
      / NULLIF(COUNT(*), 0),
    1
  ) AS conversie_pct
FROM public.profiles
WHERE signup_source IS NOT NULL
GROUP BY signup_source
ORDER BY betaald DESC, signups DESC;

REVOKE ALL ON public.acquisitie_conversie FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.acquisitie_conversie TO service_role;

COMMENT ON VIEW public.acquisitie_conversie IS
  'Kanaal → signup → betaald abonnement. Alleen via service_role (niet via PostgREST voor gebruikers).';
