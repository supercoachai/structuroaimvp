/**
 * Zelfde project key als NEXT_PUBLIC_POSTHOG_KEY (publiek).
 * Vercel: build.sh vervangt __STRUCTURO_PH_PROJECT_KEY__ tijdens deploy
 * (NEXT_PUBLIC_POSTHOG_KEY of NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN).
 */
window.__STRUCTURO_PH_KEY__ =
  window.__STRUCTURO_PH_KEY__ || "__STRUCTURO_PH_PROJECT_KEY__";
/**
 * Same-origin reverse proxy via Vercel rewrites (/ph -> eu.i.posthog.com,
 * /ph/static -> eu-assets.i.posthog.com). Adblocker-vriendelijk en bewezen.
 * De subdomein-proxy t.structuro.eu gaf 200 terug maar leverde events niet af.
 */
window.__STRUCTURO_PH_API_HOST__ =
  window.__STRUCTURO_PH_API_HOST__ || "/ph";
