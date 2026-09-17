# Technical SEO

## Domeingrens

- `structuro.eu`: kennis, gidsen, onderzoek, pers, legal.
- `structuro.ai`: product. Onboarding/login/legal indexeerbaar. `/v2` app-shell noindex in de Next-app.

## Crawl / index

- `.eu/robots.txt`: Allow `/`, sitemap-regel, OAI-SearchBot Allow (search, niet training).
- `.eu/sitemap.xml`: alleen bedoelde canonicals.
- Host: HTTPS, www, trailing slash via Vercel.

## IndexNow

`scripts/seo/indexnow.py` no-opt zonder `INDEXNOW_KEY`. Keyfile hoort publiek op `/{key}.txt`. Vervangt sitemap niet.

## Performance

Niet in CrUX gemeten deze ronde. Gidsen zijn statische HTML. Third party: PostHog, fonts, Clarity waar van toepassing.

## Wat code niet bewijst

Live redirectketens, GSC coverage, rich-resultfouten, field CWV.
