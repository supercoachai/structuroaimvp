/**
 * Publieke PostHog project key van het Structuro-hoofdproject (zelfde project
 * als de app op structuro.ai). Bewust hard ingebakken: de Vercel-env-var van
 * dit landing-project wees naar een ander PostHog-project, waardoor landing-
 * verkeer in het verkeerde project belandde. Door de key hier vast te zetten
 * (geen placeholder meer) kan build.sh hem niet meer overschrijven.
 */
window.__STRUCTURO_PH_KEY__ =
  window.__STRUCTURO_PH_KEY__ || "phc_oXc855N4x9xnfeXUDv2GVnXUsUHiEifFhofn3C7LAaz5";
/**
 * Same-origin reverse proxy via Vercel rewrites (/ph -> eu.i.posthog.com,
 * /ph/static -> eu-assets.i.posthog.com). Adblocker-vriendelijk en bewezen.
 * De subdomein-proxy t.structuro.eu gaf 200 terug maar leverde events niet af.
 */
window.__STRUCTURO_PH_API_HOST__ =
  window.__STRUCTURO_PH_API_HOST__ || "/ph";
