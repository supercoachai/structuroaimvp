/**
 * /tiktok landing: campagnes (copy) × hero-layouts (A–E).
 * Design-prototype mirror: docs/design/lp-config.jsx
 */

export type LpHeroId = "A" | "B" | "C" | "D" | "E";
export type LpCampaignId = "staren" | "nietlui" | "cyclus" | "geenlijsten" | "weten";
export type LpThemeId = "light" | "warm" | "dark";

export type LpHero = {
  id: LpHeroId;
  slug: string;
  label: string;
  note: string;
  bestFor: string;
  avoidFor: string;
};

export type LpCampaign = {
  id: LpCampaignId;
  name: string;
  note: string;
  utmContent: string;
  theme: LpThemeId;
  accent: string;
  headline: string;
  subline: string;
  cta: string;
  trust: string;
  /** Aanbevolen hero bij geen ?hero= in URL */
  defaultHero: LpHeroId;
  /** Alle heroes zijn toegestaan; default is slechts een startpunt */
  heroesAllowed: readonly LpHeroId[];
};

export const LP_BRAND = {
  blue: "#3B5BFF",
  blueDeep: "#2440D6",
  navy: "#121726",
  green: "#1FB47C",
  purple: "#8B5CF6",
  skyDark: "#8FA2FF",
} as const;

export const LP_HEROES: Record<LpHeroId, LpHero> = {
  A: {
    id: "A",
    slug: "rust",
    label: "Rust",
    note: "Ultra-minimal, veel witruimte, hook in headline.",
    bestFor: "Concrete pijn in regel 1 (staren, weten≠beginnen).",
    avoidFor: "Lange empathie zonder scherpe opener.",
  },
  B: {
    id: "B",
    slug: "live-demo",
    label: "Live demo",
    note: "Interactieve energie-picker, laat product zien.",
    bestFor: "Video eindigt op app/dagstart, cyclus-angle met demo.",
    avoidFor: "Donkere cinematic ad zonder product in beeld.",
  },
  C: {
    id: "C",
    slug: "dark-focus",
    label: "Dark focus",
    note: "Donker, high contrast, één sterke belofte.",
    bestFor: "Confronterende hook, nachtelijke TikTok-esthetiek.",
    avoidFor: "Lichte app-demo direct erna (visuele mismatch).",
  },
  D: {
    id: "D",
    slug: "one-promise",
    label: "One promise",
    note: "Warm, editorial (serif), langzamer vertrouwen opbouwen.",
    bestFor: "Warm retargeting, Instagram saves, tweede bezoek.",
    avoidFor: "Koud TikTok zonder harde hook in video én headline.",
  },
  E: {
    id: "E",
    slug: "ochtendritueel",
    label: "Ochtendritueel",
    note: "Drie stappen + sticky CTA, legt de loop uit.",
    bestFor: "Payoff in video = '3 tikken' / anti-lijst uitleg.",
    avoidFor: "Video zonder duidelijke stappen-belofte.",
  },
};

const ALL_HEROES: readonly LpHeroId[] = ["A", "B", "C", "D", "E"];

/** Fallback campagne zonder URL-params (legacy LP was cyclus-hook). */
export const LP_DEFAULT_CAMPAIGN_ID: LpCampaignId = "cyclus";

/** Standaard campagne voor organische bridge (/start, structuro.eu). */
export const LP_ORGANIC_DEFAULT_CAMPAIGN_ID: LpCampaignId = "weten";

/** Standaard hero op /start: warme lichte entree (layout A). Donker via ?hero=C. */
export const LP_ORGANIC_DEFAULT_HERO: LpHeroId = "A";

export const LP_RITUAL_STEPS = [
  { title: "Kies je energie", desc: "Eén tik: laag, midden of hoog." },
  { title: "Krijg 1 tot 3 taken", desc: "Passend bij je dag. Nooit meer." },
  { title: "Doe ze. Klaar.", desc: "Geen lijsten, geen schuld." },
] as const;

export const LP_CAMPAIGNS: readonly LpCampaign[] = [
  {
    id: "staren",
    name: "40 min staren",
    note: "Concrete pijn, geen uitleg. Hook uit ad slide 1.",
    utmContent: "hook_40min_staren",
    theme: "light",
    accent: LP_BRAND.blue,
    headline: "9:47. Je staart al 40 minuten naar je taken. Niks gedaan.",
    subline: "Geen luiheid. Je brein start gewoon anders op.",
    cta: "Start 3 dagen gratis",
    trust: "Geen verplichtingen. 3 dagen, daarna beslis jij.",
    defaultHero: "A",
    heroesAllowed: ALL_HEROES,
  },
  {
    id: "nietlui",
    name: "Niet lui",
    note: "Reframe zonder shame. Alleen als hook in video ook scherp is.",
    utmContent: "hook_niet_lui",
    theme: "warm",
    accent: LP_BRAND.green,
    headline: "Je bent niet lui. Je brein start gewoon anders op.",
    subline: "Structuro is gebouwd op hoe een ADHD-brein echt begint.",
    cta: "Start 3 dagen gratis",
    trust: "Geen verplichtingen. 3 dagen, daarna beslis jij.",
    defaultHero: "A",
    heroesAllowed: ALL_HEROES,
  },
  {
    id: "cyclus",
    name: "Week 3 / cyclus",
    note: "Luteale week, vrouwelijke doelgroep.",
    utmContent: "hook_week3_cyclus",
    theme: "light",
    accent: LP_BRAND.purple,
    headline: "En in week 3 van je cyclus? Dan voelt alles 10× zwaarder.",
    subline: "Je cyclus stuurt je focus. Structuro past je dag erop aan.",
    cta: "Start 3 dagen gratis",
    trust: "Geen verplichtingen. 3 dagen, daarna beslis jij.",
    defaultHero: "B",
    heroesAllowed: ALL_HEROES,
  },
  {
    id: "geenlijsten",
    name: "Geen lijsten",
    note: "Anti to-do app, tegen eindeloze lijsten.",
    utmContent: "hook_geen_lijsten",
    theme: "light",
    accent: LP_BRAND.blue,
    headline: "Nog een to-dolijst die je niet meer opent? Niet nodig.",
    subline: "Een energie-check. Daarna maximaal 3 taken. Geen schuldgevoel.",
    cta: "Start 3 dagen gratis",
    trust: "Geen verplichtingen. 3 dagen, daarna beslis jij.",
    defaultHero: "E",
    heroesAllowed: ALL_HEROES,
  },
  {
    id: "weten",
    name: "Weten is niet beginnen",
    note: "Executie-gap, confronterend zonder shame.",
    utmContent: "hook_weten_vs_beginnen",
    theme: "dark",
    accent: LP_BRAND.blue,
    headline: "Je weet precies wat je moet doen. En toch begin je niet.",
    subline: "Dat is je brein. Niet jij. Structuro overbrugt dat gat.",
    cta: "Start 3 dagen gratis",
    trust: "Geen verplichtingen. 3 dagen, daarna beslis jij.",
    defaultHero: "A",
    heroesAllowed: ALL_HEROES,
  },
] as const;

/**
 * Aanbevolen startcombinatie campagne → hero.
 * Alle andere heroes blijven expliciet toegestaan via ?hero=
 */
export const LP_HERO_CAMPAIGN_DEFAULTS: Record<LpCampaignId, LpHeroId> = {
  staren: "A",
  nietlui: "A",
  cyclus: "B",
  geenlijsten: "E",
  weten: "A",
};

/** Alternatieven die vaak werken na A/B-test */
export const LP_HERO_CAMPAIGN_ALTERNATIVES: Record<LpCampaignId, readonly LpHeroId[]> = {
  staren: ["B"],
  nietlui: ["B"],
  cyclus: ["A", "B"],
  geenlijsten: ["A", "B"],
  weten: ["A", "C"],
};

export type LpResolvedVariant = {
  campaign: LpCampaign;
  hero: LpHero;
  heroSource: "query" | "campaign-default" | "fallback";
};

function isHeroId(value: string): value is LpHeroId {
  return value === "A" || value === "B" || value === "C" || value === "D" || value === "E";
}

function sanitizeHero(raw: string | null | undefined): LpHeroId | null {
  const token = (raw ?? "").trim().toUpperCase().slice(0, 1);
  return isHeroId(token) ? token : null;
}

function sanitizeCampaignId(raw: string | null | undefined): LpCampaignId | null {
  const id = (raw ?? "").trim().toLowerCase();
  return LP_CAMPAIGNS.some((c) => c.id === id) ? (id as LpCampaignId) : null;
}

/** Match campagne op ?campaign= of utm_content (exact of prefix content_id). */
export function resolveLpCampaign(params: {
  campaign?: string | null;
  utmContent?: string | null;
}): LpCampaign {
  const byQuery = sanitizeCampaignId(params.campaign);
  if (byQuery) {
    return LP_CAMPAIGNS.find((c) => c.id === byQuery)!;
  }

  const content = (params.utmContent ?? "").trim().toLowerCase();
  if (content) {
    const exact = LP_CAMPAIGNS.find((c) => c.utmContent.toLowerCase() === content);
    if (exact) return exact;

    const partial = LP_CAMPAIGNS.find(
      (c) => content.includes(c.id) || content.includes(c.utmContent.toLowerCase())
    );
    if (partial) return partial;
  }

  return LP_CAMPAIGNS.find((c) => c.id === LP_DEFAULT_CAMPAIGN_ID) ?? LP_CAMPAIGNS[0];
}

/** Hero uit ?hero=; anders defaultHero van campagne. */
export function resolveLpHero(campaign: LpCampaign, heroQuery?: string | null): LpHeroId {
  const fromQuery = sanitizeHero(heroQuery);
  if (fromQuery && campaign.heroesAllowed.includes(fromQuery)) {
    return fromQuery;
  }
  return campaign.defaultHero;
}

export function resolveLpVariant(params: {
  campaign?: string | null;
  utmContent?: string | null;
  hero?: string | null;
}): LpResolvedVariant {
  const campaign = resolveLpCampaign(params);
  const fromQuery = sanitizeHero(params.hero);
  if (fromQuery && campaign.heroesAllowed.includes(fromQuery)) {
    return {
      campaign,
      hero: LP_HEROES[fromQuery],
      heroSource: "query",
    };
  }
  const heroId = campaign.defaultHero;
  return {
    campaign,
    hero: LP_HEROES[heroId],
    heroSource: "campaign-default",
  };
}

/** URL voor bio/Promote met campagne + hero + content_id. */
export function buildTikTokLandingUrl(opts: {
  contentId: string;
  campaign?: LpCampaignId;
  hero?: LpHeroId;
  medium?: "organic" | "paid_social";
  campaignUtm?: string;
}): string {
  const params = new URLSearchParams({
    utm_source: "tiktok",
    utm_medium: opts.medium ?? "paid_social",
    utm_campaign: opts.campaignUtm ?? "tiktok_promote",
    utm_content: opts.contentId,
  });
  if (opts.campaign) params.set("campaign", opts.campaign);
  if (opts.hero) params.set("hero", opts.hero);
  return `https://www.structuro.ai/tiktok?${params.toString()}`;
}

/** Organische bridge-URL (structuro.eu, geen TikTok-attributie). */
export function buildOrganicStartUrl(opts: {
  contentId: string;
  campaign?: LpCampaignId;
  hero?: LpHeroId;
  medium?: "organic" | "referral";
  campaignUtm?: string;
}): string {
  const params = new URLSearchParams({
    utm_source: "structuro_eu",
    utm_medium: opts.medium ?? "organic",
    utm_campaign: opts.campaignUtm ?? "website",
    utm_content: opts.contentId,
  });
  if (opts.campaign) params.set("campaign", opts.campaign);
  if (opts.hero) params.set("hero", opts.hero);
  return `https://www.structuro.ai/start?${params.toString()}`;
}
