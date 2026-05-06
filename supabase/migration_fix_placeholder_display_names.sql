-- Eenmalig in productie/staging uitvoeren via Supabase SQL Editor (of migrate via CLI na review).
--
-- Verplichtingen uit audit: placeholders `Gebruiker` / `User` en lege naam vervangen
-- door lokale deel van het e-mailadres uit auth.users (geen gebruikers-interface string).
--
-- Let op:
-- - Alleen aanpassingen waar het profiel foutieve placeholder-weergaven heeft.
-- - Bij meerdere accounts met hetzelfde e-mail-prefix krijgen ze dezelfde weergavenaam;
--   dat is per ontwerp zoals gevraagd (prefix); gebruikers kunnen daarna in Instellingen finetunen.

UPDATE public.profiles AS p
SET
  display_name = local_part.part,
  preferred_name = CASE
    WHEN p.preferred_name IS NULL
      OR btrim(p.preferred_name::text) = ''
      OR lower(btrim(p.preferred_name::text)) IN ('gebruiker', 'user')
      OR lower(btrim(COALESCE(p.preferred_name::text, '')))
        = lower(btrim(COALESCE(p.display_name::text, '')))
    THEN local_part.part
    ELSE left(btrim(p.preferred_name::text), 200)
  END
FROM auth.users AS u,
LATERAL (
  SELECT
    left(
      split_part(btrim(lower(u.email::text)), '@', 1),
      200
    ) AS part
) AS local_part
WHERE p.id = u.id
  AND u.email IS NOT NULL
  AND POSITION('@' IN btrim(lower(u.email::text))) > 1
  AND local_part.part IS NOT NULL
  AND btrim(local_part.part::text) <> ''
  AND (
    p.display_name IS NULL
    OR btrim(p.display_name::text) = ''
    OR lower(btrim(p.display_name::text)) IN ('gebruiker', 'user')
  );
