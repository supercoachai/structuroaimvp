/**
 * PostHog dashboard: structuro.eu acquisitie & gedrag.
 *
 * Vereist Personal API key (phx_…), niet de project key (phc_…).
 *
 * Usage:
 *   export POSTHOG_PERSONAL_API_KEY='phx_...'
 *   npm run posthog:eu-dashboard
 *
 * Optioneel: POSTHOG_PROJECT_ID=175224 (default)
 */
const HOST = "https://eu.posthog.com";
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID?.trim() || "175224";
const API_KEY =
  process.env.POSTHOG_PERSONAL_API_KEY?.trim() ||
  process.env.POSTHOG_API_KEY?.trim();

const EU_SITE_FILTER = {
  key: "site",
  operator: "exact",
  type: "event",
  value: ["eu"],
};

const STRUCTURO_EU_SOURCE_FILTER = {
  key: "source",
  operator: "exact",
  type: "event",
  value: ["structuro_eu"],
};

const ORGANIC_START_PATH_FILTER = {
  key: "landing_path",
  operator: "exact",
  type: "event",
  value: ["/start"],
};

function eventStep(event, properties = []) {
  const node = { kind: "EventsNode", event };
  if (properties.length) node.properties = properties;
  return node;
}

const EU_ACQUISITION_FUNNEL = {
  kind: "InsightVizNode",
  source: {
    kind: "FunnelsQuery",
    series: [
      eventStep("$pageview", [EU_SITE_FILTER]),
      eventStep("cta_clicked", [EU_SITE_FILTER]),
      eventStep("acquisition_landing_viewed", [
        STRUCTURO_EU_SOURCE_FILTER,
        ORGANIC_START_PATH_FILTER,
      ]),
      eventStep("organic_landing_cta_clicked", [STRUCTURO_EU_SOURCE_FILTER]),
      eventStep("signup_completed", [STRUCTURO_EU_SOURCE_FILTER]),
      eventStep("dagstart_completed", []),
    ],
    dateRange: { date_from: "-30d" },
    funnelsFilter: {
      funnelOrderType: "ordered",
      funnelVizType: "steps",
      funnelWindowInterval: 14,
      funnelWindowIntervalUnit: "day",
    },
    filterTestAccounts: true,
  },
};

const EU_TRAFFIC_TRENDS = {
  kind: "InsightVizNode",
  source: {
    kind: "TrendsQuery",
    series: [
      { kind: "EventsNode", event: "$pageview", math: "dau", properties: [EU_SITE_FILTER] },
      {
        kind: "EventsNode",
        event: "$pageview",
        math: "total",
        properties: [EU_SITE_FILTER],
      },
    ],
    dateRange: { date_from: "-30d" },
    interval: "day",
    filterTestAccounts: true,
  },
};

const EU_CTA_BREAKDOWN = {
  kind: "InsightVizNode",
  source: {
    kind: "TrendsQuery",
    series: [
      {
        kind: "EventsNode",
        event: "cta_clicked",
        math: "total",
        properties: [EU_SITE_FILTER],
      },
    ],
    breakdownFilter: {
      breakdown: "cta_id",
      breakdown_type: "event",
    },
    dateRange: { date_from: "-30d" },
    interval: "day",
    filterTestAccounts: true,
  },
};

const EU_SECTION_VIEWS = {
  kind: "InsightVizNode",
  source: {
    kind: "TrendsQuery",
    series: [
      {
        kind: "EventsNode",
        event: "eu_section_viewed",
        math: "total",
        properties: [EU_SITE_FILTER],
      },
    ],
    breakdownFilter: {
      breakdown: "section_id",
      breakdown_type: "event",
    },
    dateRange: { date_from: "2026-06-13" },
    interval: "day",
    filterTestAccounts: true,
  },
};

const EU_SCROLL_DEPTH = {
  kind: "InsightVizNode",
  source: {
    kind: "TrendsQuery",
    series: [
      {
        kind: "EventsNode",
        event: "eu_scroll_depth",
        math: "unique_session",
        properties: [EU_SITE_FILTER],
      },
    ],
    breakdownFilter: {
      breakdown: "percent",
      breakdown_type: "event",
    },
    dateRange: { date_from: "-30d" },
    interval: "month",
    filterTestAccounts: true,
  },
};

const EU_FAQ_OPENS = {
  kind: "InsightVizNode",
  source: {
    kind: "TrendsQuery",
    series: [
      {
        kind: "EventsNode",
        event: "eu_faq_opened",
        math: "total",
        properties: [EU_SITE_FILTER],
      },
    ],
    breakdownFilter: {
      breakdown: "faq_id",
      breakdown_type: "event",
    },
    dateRange: { date_from: "-30d" },
    interval: "week",
    filterTestAccounts: true,
  },
};

const INSIGHTS = [
  {
    name: "EU acquisitie funnel (eu → start → signup → dagstart)",
    description:
      "Primaire conversieketen structuro.eu. Niet waitlist. Cross-domain kan onder tellen zonder identity merge.",
    query: EU_ACQUISITION_FUNNEL,
    layout: { sm: { h: 5, w: 12, x: 0, y: 0 } },
  },
  {
    name: "EU verkeer (bezoekers & pageviews)",
    description: "Unieke bezoekers en pageviews met site=eu.",
    query: EU_TRAFFIC_TRENDS,
    layout: { sm: { h: 4, w: 6, x: 0, y: 5 } },
  },
  {
    name: "EU CTA clicks per cta_id",
    description: "Breakdown hero, nav, footer, media. Tracking sinds ~11 juni.",
    query: EU_CTA_BREAKDOWN,
    layout: { sm: { h: 4, w: 6, x: 6, y: 5 } },
  },
  {
    name: "EU secties bekeken (sinds 13 jun)",
    description: "Alleen data na redesign; negeer historische section_id waarom.",
    query: EU_SECTION_VIEWS,
    layout: { sm: { h: 5, w: 12, x: 0, y: 9 } },
  },
  {
    name: "EU scroll-diepte (unieke sessies)",
    description: "25/50/75/100% milestones.",
    query: EU_SCROLL_DEPTH,
    layout: { sm: { h: 4, w: 6, x: 0, y: 14 } },
  },
  {
    name: "EU FAQ opens per vraag",
    description: "Top FAQ-items voor copy-optimalisatie.",
    query: EU_FAQ_OPENS,
    layout: { sm: { h: 4, w: 6, x: 6, y: 14 } },
  },
];

async function api(path, options = {}) {
  const res = await fetch(`${HOST}/api/projects/${PROJECT_ID}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(
      `PostHog API ${options.method || "GET"} ${path} → ${res.status}: ${JSON.stringify(body)}`
    );
  }
  return body;
}

async function findInsightByName(name) {
  const data = await api(
    `/insights/?search=${encodeURIComponent(name)}&saved=true&limit=100`
  );
  const results = data?.results ?? [];
  return results.find((row) => row.name === name) ?? null;
}

async function findDashboardByName(name) {
  const data = await api(`/dashboards/?search=${encodeURIComponent(name)}&limit=100`);
  const results = data?.results ?? [];
  return results.find((row) => row.name === name) ?? null;
}

async function ensureInsight(def) {
  const existing = await findInsightByName(def.name);
  if (existing?.id) {
    const updated = await api(`/insights/${existing.id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        description: def.description,
        query: def.query,
      }),
    });
    console.log(`Insight bijgewerkt: ${def.name} (${updated.short_id})`);
    return updated;
  }
  const created = await api("/insights/", {
    method: "POST",
    body: JSON.stringify({
      name: def.name,
      description: def.description,
      saved: true,
      favorited: true,
      query: def.query,
    }),
  });
  console.log(`Insight aangemaakt: ${def.name} (${created.short_id})`);
  return created;
}

async function ensureDashboard(name, tiles) {
  const existing = await findDashboardByName(name);
  if (existing?.id) {
    await api(`/dashboards/${existing.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ tiles }),
    });
    console.log(`Dashboard bijgewerkt: ${name} (id ${existing.id})`);
    return existing;
  }
  const created = await api("/dashboards/", {
    method: "POST",
    body: JSON.stringify({
      name,
      description:
        "Structuro.eu: verkeer, gedrag, CTA's en acquisitie-funnel (niet waitlist).",
      pinned: true,
      tiles,
    }),
  });
  console.log(`Dashboard aangemaakt: ${name} (id ${created.id})`);
  return created;
}

async function main() {
  if (!API_KEY?.startsWith("phx_")) {
    console.error(
      "Geen geldige POSTHOG_PERSONAL_API_KEY (phx_…). Maak een key in PostHog → Settings → Personal API keys."
    );
    process.exit(1);
  }

  const insightRows = [];
  for (const def of INSIGHTS) {
    const insight = await ensureInsight(def);
    insightRows.push({
      insight: insight.id,
      layouts: def.layout,
    });
  }

  const dashboard = await ensureDashboard("Structuro.eu Acquisitie", insightRows);
  const url = `${HOST}/project/${PROJECT_ID}/dashboard/${dashboard.id}`;
  console.log(`\nDashboard: ${url}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
