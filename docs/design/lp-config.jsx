// lp-config.jsx — Structuro /tiktok: campagnes × hero-layouts (A–E)
// Canonical mirror: src/lib/tiktok/lpConfig.ts
// Design prototypes: Structuro hero alternatieven.html, Structuro - TikTok landing.html

const LP_BRAND = {
  blue: '#3B5BFF', blueDeep: '#2440D6', navy: '#121726',
  green: '#1FB47C', purple: '#8B5CF6', skyDark: '#8FA2FF',
};
window.LP_BRAND = LP_BRAND;

// ── Hero layouts A–E (alle vijf blijven open) ───────────────────────────────
const LP_HEROES = {
  A: {
    id: 'A', slug: 'rust', label: 'Rust',
    note: 'Ultra-minimal, hook in headline.',
    bestFor: 'Concrete pijn (staren, weten≠beginnen).',
    avoidFor: 'Lange empathie zonder scherpe opener.',
  },
  B: {
    id: 'B', slug: 'live-demo', label: 'Live demo',
    note: 'Interactieve energie-picker.',
    bestFor: 'Video eindigt op app/dagstart.',
    avoidFor: 'Donkere ad zonder product in beeld.',
  },
  C: {
    id: 'C', slug: 'dark-focus', label: 'Dark focus',
    note: 'Donker, high contrast.',
    bestFor: 'Confronterende hook, nachtelijke esthetiek.',
    avoidFor: 'Lichte app-demo direct erna.',
  },
  D: {
    id: 'D', slug: 'one-promise', label: 'One promise',
    note: 'Warm, editorial (serif).',
    bestFor: 'Warm retargeting, Instagram, tweede bezoek.',
    avoidFor: 'Koud TikTok zonder harde hook.',
  },
  E: {
    id: 'E', slug: 'ochtendritueel', label: 'Ochtendritueel',
    note: 'Drie stappen + sticky CTA.',
    bestFor: 'Payoff = 3 tikken / anti-lijst.',
    avoidFor: 'Video zonder stappen-belofte.',
  },
};
window.LP_HEROES = LP_HEROES;

const ALL_HEROES = ['A', 'B', 'C', 'D', 'E'];

/** Aanbevolen startcombinatie per campagne (alle heroes blijven toegestaan) */
const LP_HERO_CAMPAIGN_DEFAULTS = {
  staren: 'A',
  nietlui: 'A',
  cyclus: 'B',
  geenlijsten: 'E',
  weten: 'C',
};
window.LP_HERO_CAMPAIGN_DEFAULTS = LP_HERO_CAMPAIGN_DEFAULTS;

const LP_HERO_CAMPAIGN_ALTERNATIVES = {
  staren: ['B'],
  nietlui: ['B'],
  cyclus: ['A', 'B'],
  geenlijsten: ['A', 'B'],
  weten: ['A', 'C'],
};
window.LP_HERO_CAMPAIGN_ALTERNATIVES = LP_HERO_CAMPAIGN_ALTERNATIVES;

const LP_THEMES = {
  light: {
    id: 'light', pageBg: '#EEF1FB', surface: '#FFFFFF', surfaceAlt: '#F5F7FD',
    ink: '#121726', inkSoft: 'rgba(18,23,38,0.64)', muted: 'rgba(18,23,38,0.46)',
    line: 'rgba(18,23,38,0.08)', lineStrong: 'rgba(18,23,38,0.14)',
    heroFamily: '"Schibsted Grotesk", system-ui, sans-serif', heroWeight: 700,
    heroSpacing: '-0.03em', ctaInk: '#FFFFFF', glow: false,
  },
  warm: {
    id: 'warm', pageBg: '#F4F1E9', surface: '#FBF9F4', surfaceAlt: '#F0ECE1',
    ink: '#211C15', inkSoft: 'rgba(33,28,21,0.66)', muted: 'rgba(33,28,21,0.46)',
    line: 'rgba(33,28,21,0.10)', lineStrong: 'rgba(33,28,21,0.16)',
    heroFamily: '"Instrument Serif", Georgia, serif', heroWeight: 400,
    heroSpacing: '-0.01em', ctaInk: '#FBF9F4', glow: false,
  },
  dark: {
    id: 'dark', pageBg: '#0C1124', surface: 'rgba(255,255,255,0.055)', surfaceAlt: 'rgba(255,255,255,0.035)',
    ink: '#FFFFFF', inkSoft: 'rgba(255,255,255,0.66)', muted: 'rgba(255,255,255,0.44)',
    line: 'rgba(255,255,255,0.10)', lineStrong: 'rgba(255,255,255,0.18)',
    heroFamily: '"Schibsted Grotesk", system-ui, sans-serif', heroWeight: 800,
    heroSpacing: '-0.035em', ctaInk: '#0C1124', glow: true,
  },
};
window.LP_THEMES = LP_THEMES;

const LP_BASE = {
  whatLine: 'Elke ochtend een energie-check, daarna maximaal 3 taken, en een stap tegelijk.',
  steps: [
    { t: 'Check je energie', d: 'Een tik: laag, midden of hoog.' },
    { t: 'Krijg 1 tot 3 taken', d: 'Passend bij je dag. Nooit een eindeloze lijst.' },
    { t: 'Een stap tegelijk', d: 'Structuro hakt de taak op.' },
  ],
  proofPlaceholder: 'Korte, echte quote van een tester komt hier.',
  ctaDefault: 'Start 3 dagen gratis',
  trustDefault: 'Geen verplichtingen. 3 dagen, daarna beslis jij.',
  footer: 'Data in de EU · Opzeggen in een tik · Geen creditcard nodig',
};
window.LP_BASE = LP_BASE;

const LP_CAMPAIGNS = [
  {
    id: 'staren', name: '40 min staren', utmContent: 'hook_40min_staren',
    theme: 'light', accent: LP_BRAND.blue, defaultHero: 'A', heroesAllowed: ALL_HEROES,
    headline: '9:47. Je staart al 40 minuten naar je taken. Niks gedaan.',
    subline: 'Geen luiheid. Je brein start gewoon anders op.',
    cta: 'Start 3 dagen gratis', trust: 'Geen verplichtingen. 3 dagen, daarna beslis jij.',
  },
  {
    id: 'nietlui', name: 'Niet lui', utmContent: 'hook_niet_lui',
    theme: 'warm', accent: LP_BRAND.green, defaultHero: 'A', heroesAllowed: ALL_HEROES,
    headline: 'Je bent niet lui. Je brein start gewoon anders op.',
    subline: 'Structuro is gebouwd op hoe een ADHD-brein echt begint.',
    cta: 'Start 3 dagen gratis', trust: 'Geen verplichtingen. 3 dagen, daarna beslis jij.',
  },
  {
    id: 'cyclus', name: 'Week 3 / cyclus', utmContent: 'hook_week3_cyclus',
    theme: 'light', accent: LP_BRAND.purple, defaultHero: 'B', heroesAllowed: ALL_HEROES,
    headline: 'En in week 3 van je cyclus? Dan voelt alles 10× zwaarder.',
    subline: 'Je cyclus stuurt je focus. Structuro past je dag erop aan.',
    cta: 'Start 3 dagen gratis', trust: 'Geen verplichtingen. 3 dagen, daarna beslis jij.',
  },
  {
    id: 'geenlijsten', name: 'Geen lijsten', utmContent: 'hook_geen_lijsten',
    theme: 'light', accent: LP_BRAND.blue, defaultHero: 'E', heroesAllowed: ALL_HEROES,
    headline: 'Nog een to-dolijst die je niet meer opent? Niet nodig.',
    subline: 'Een energie-check. Daarna maximaal 3 taken. Geen schuldgevoel.',
    cta: 'Start 3 dagen gratis', trust: 'Geen verplichtingen. 3 dagen, daarna beslis jij.',
  },
  {
    id: 'weten', name: 'Weten is niet beginnen', utmContent: 'hook_weten_vs_beginnen',
    theme: 'dark', accent: LP_BRAND.skyDark, defaultHero: 'C', heroesAllowed: ALL_HEROES,
    headline: 'Je weet precies wat je moet doen. En toch begin je niet.',
    subline: 'Dat is je brein. Niet jij. Structuro overbrugt dat gat.',
    cta: 'Start 3 dagen gratis', trust: 'Geen verplichtingen. 3 dagen, daarna beslis jij.',
  },
];
window.LP_CAMPAIGNS = LP_CAMPAIGNS;

function lpResolveCampaign(params) {
  const p = params || {};
  const byId = (p.campaign || '').trim().toLowerCase();
  const found = LP_CAMPAIGNS.find((c) => c.id === byId);
  if (found) return found;
  const content = (p.utmContent || '').trim().toLowerCase();
  if (content) {
    const exact = LP_CAMPAIGNS.find((c) => c.utmContent.toLowerCase() === content);
    if (exact) return exact;
    const partial = LP_CAMPAIGNS.find((c) => content.includes(c.id) || content.includes(c.utmContent.toLowerCase()));
    if (partial) return partial;
  }
  return LP_CAMPAIGNS[0];
}

function lpResolveHero(campaign, heroQuery) {
  const h = (heroQuery || '').trim().toUpperCase().slice(0, 1);
  if (ALL_HEROES.includes(h) && campaign.heroesAllowed.includes(h)) return LP_HEROES[h];
  return LP_HEROES[campaign.defaultHero];
}

function lpBuildLandingUrl(opts) {
  const o = opts || {};
  const params = new URLSearchParams({
    utm_source: 'tiktok',
    utm_medium: o.medium || 'paid_social',
    utm_campaign: o.campaignUtm || 'tiktok_promote',
    utm_content: o.contentId,
  });
  if (o.campaign) params.set('campaign', o.campaign);
  if (o.hero) params.set('hero', o.hero);
  return 'https://www.structuro.ai/tiktok?' + params.toString();
}

window.lpResolveCampaign = lpResolveCampaign;
window.lpResolveHero = lpResolveHero;
window.lpBuildLandingUrl = lpBuildLandingUrl;

function lpReadUTM() {
  const p = new URLSearchParams(window.location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'campaign', 'hero'];
  const out = {};
  keys.forEach((k) => { const v = p.get(k); if (v) out[k] = v; });
  if (!out.utm_source) out.utm_source = 'tiktok';
  if (!out.utm_medium) out.utm_medium = 'paid_social';
  if (!out.utm_campaign) out.utm_campaign = 'tiktok_promote';
  return out;
}

function lpRegisterHref(utm) {
  const qs = new URLSearchParams(utm).toString();
  return '/registreren' + (qs ? '?' + qs : '');
}

function lpTrack(event, props) {
  const payload = props || {};
  try { if (window.posthog && window.posthog.capture) window.posthog.capture(event, payload); } catch (e) {}
  console.log('[posthog]', event, payload);
}

window.lpReadUTM = lpReadUTM;
window.lpRegisterHref = lpRegisterHref;
window.lpTrack = lpTrack;
