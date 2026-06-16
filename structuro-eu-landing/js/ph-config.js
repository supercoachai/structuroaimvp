/**
 * Zelfde project key als NEXT_PUBLIC_POSTHOG_KEY (publiek).
 * Vercel: build.sh vervangt __STRUCTURO_PH_PROJECT_KEY__ tijdens deploy.
 */
window.__STRUCTURO_PH_KEY__ =
  window.__STRUCTURO_PH_KEY__ || "__STRUCTURO_PH_PROJECT_KEY__";
/** Managed reverse proxy; zelfde host als NEXT_PUBLIC_POSTHOG_HOST op structuro.ai. */
window.__STRUCTURO_PH_API_HOST__ =
  window.__STRUCTURO_PH_API_HOST__ || "https://t.structuro.eu";
