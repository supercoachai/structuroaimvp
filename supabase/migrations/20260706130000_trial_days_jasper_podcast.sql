-- Trial-duur per signup_source in sync met EVENT_TRIAL_BY_SIGNUP_SOURCE
-- (src/lib/stripe/trialConfig.ts, de bron van waarheid).
--
-- Bug: jasper_podcast (7 dagen) ontbrak hier, waardoor de cron expire_trials()
-- Jasper-luisteraars na de default 3 dagen afkapte. Deze migratie spiegelt de
-- volledige config zodat een volgende bron niet opnieuw alleen in TypeScript
-- bestaat:
--   - adhd_cafe:      14 dagen, geldig t/m 2026-12-31 (validUntilYmd)
--   - jasper_podcast:  7 dagen, evergreen
--   - default:         3 dagen
--
-- LET OP bij een nieuwe bron in trialConfig.ts: ook deze functie bijwerken.

CREATE OR REPLACE FUNCTION public.profile_has_active_app_trial(
  p_created_at timestamptz,
  p_signup_source text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    p_created_at IS NOT NULL
    AND now() < (
      p_created_at + (
        CASE
          -- adhd_cafe: 14 dagen zolang de actie loopt (validUntilYmd 2026-12-31,
          -- vergelijking op UTC-datum, zelfde als todayYmdUtc() in trialConfig.ts)
          WHEN lower(trim(coalesce(p_signup_source, ''))) = 'adhd_cafe'
            AND (now() AT TIME ZONE 'UTC')::date <= DATE '2026-12-31'
            THEN interval '14 days'
          -- jasper_podcast: 7 dagen, evergreen (geen einddatum)
          WHEN lower(trim(coalesce(p_signup_source, ''))) = 'jasper_podcast'
            THEN interval '7 days'
          ELSE interval '3 days'
        END
      )
    );
$$;

COMMENT ON FUNCTION public.profile_has_active_app_trial(timestamptz, text) IS
  'App-trial actief? Duur per signup_source, spiegel van EVENT_TRIAL_BY_SIGNUP_SOURCE in src/lib/stripe/trialConfig.ts.';
