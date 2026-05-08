/**
 * Zelfde project key als NEXT_PUBLIC_POSTHOG_KEY (publiek).
 * Vercel: build.sh vervangt __STRUCTURO_PH_PROJECT_KEY__ tijdens deploy.
 */
window.__STRUCTURO_PH_KEY__ =
  window.__STRUCTURO_PH_KEY__ || "__STRUCTURO_PH_PROJECT_KEY__";
