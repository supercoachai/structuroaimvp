# SEO-audit Structuro (17 september 2026)

Implementatiekwaliteit, geen rankinggarantie. Marketinghost: `www.structuro.eu`. App: `www.structuro.ai`.

## Wat dit niet is

Geen 5.001 pagina's. Elke keywordrij heeft een beslissing. Canonicals volgen zoekintentie, niet spellingvarianten.

## Bevindingen (code)

| Onderdeel | Status |
|---|---|
| robots.txt `.eu` | Allow. Search-crawlers (Googlebot, Bingbot, OAI-SearchBot) en training (GPTBot) bewust gescheiden in commentaar. |
| robots `.ai` | Publieke ingangen Allow, app-shell Disallow. |
| sitemap.xml | Canonical gidsen, legal NL/EN, `/adhd-app/`, `/executieve-functies-adhd/`. Geen `/v2/`. |
| Canonicals | Absolute `https://www.structuro.eu/.../` op gidsen. |
| Trailing slash | `vercel.json` redirects + rewrites. Apex naar www. |
| Rendering | Statische HTML. Koppen niet afhankelijk van late JS. |
| hreflang | Alleen echte vertalingen. NL-only gidsen zonder fake EN. |
| JSON-LD | Organization, WebSite, Article, BreadcrumbList, Person op homepage. Geen fake ratings. |
| YMYL | Diagnose, medicatie, supplementen, kinderen, rijbewijs: HOLD. Vrouwen-pagina blijft executie, geen test. |
| Trialcopy | Gidsen volgen homepage-FAQ: dagstart zonder account, trial met betaalmethode. |

## Open (extern)

- Google Search Console: indexdekking, rich results, generatieve zichtbaarheid.
- Bing Webmaster AI Performance.
- CrUX / field Core Web Vitals.
- Digitale PR: outreach niet verstuurd.
- Medische reviewer: ontbreekt; YMYL blijft HOLD.
