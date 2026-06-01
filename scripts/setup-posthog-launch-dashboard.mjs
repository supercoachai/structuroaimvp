/**
 * Maakt het PostHog launch-dashboard aan (funnel + trends).
 *
 * Vereist een Personal API key (phx_…), niet de project key (phc_…).
 *
 * Usage:
 *   export POSTHOG_PERSONAL_API_KEY='phx_...'
 *   npm run posthog:launch-dashboard
 *
 * Optioneel: POSTHOG_PROJECT_ID=175224 (default)
 */
const HOST = "https://eu.posthog.com";
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID?.trim() || "175224";
const API_KEY =
  process.env.POSTHOG_PERSONAL_API_KEY?.trim() ||
  process.env.POSTHOG_API_KEY?.trim();

const SERVER_CHANNEL_FILTER = {
  key: "channel",
  operator: "exact",
  type: "event",
  value: ["server"],
};

function funnelStep(event, withChannel = true) {
  const node = { kind: "EventsNode", event };
  if (withChannel) {
    node.properties = [SERVER_CHANNEL_FILTER];
  }
  return node;
}

const LAUNCH_FUNNEL_QUERY = {
  kind: "InsightVizNode",
  source: {
    kind: "FunnelsQuery",
    series: [
      funnelStep("signup_completed"),
      funnelStep("registreren_plan_viewed"),
      funnelStep("checkout_started"),
      funnelStep("subscription_started", false),
    ],
    dateRange: { date_from: "-14d" },
    funnelsFilter: {
      funnelOrderType: "ordered",
      funnelVizType: "steps",
      funnelWindowInterval: 14,
      funnelWindowIntervalUnit: "day",
    },
    filterTestAccounts: true,
  },
};

function trendsSeries(event, withChannel = true) {
  const node = {
    kind: "EventsNode",
    event,
    math: "dau",
  };
  if (withChannel) {
    node.properties = [SERVER_CHANNEL_FILTER];
  }
  return node;
}

const LAUNCH_TRENDS_QUERY = {
  kind: "InsightVizNode",
  source: {
    kind: "TrendsQuery",
    series: [
      trendsSeries("signup_completed"),
      trendsSeries("registreren_plan_viewed"),
      trendsSeries("checkout_started"),
      trendsSeries("subscription_started", false),
    ],
    dateRange: { date_from: "-14d" },
    interval: "day",
    filterTestAccounts: true,
  },
};

const INSIGHTS = [
  {
    name: "Launch funnel (server)",
    description:
      "Registratie → plan → checkout → betaling. Filter channel=server op stappen 1–3.",
    query: LAUNCH_FUNNEL_QUERY,
    layout: { sm: { h: 5, w: 12, x: 0, y: 0 } },
  },
  {
    name: "Launch pulse (server)",
    description: "Dagelijkse unieke users per launch-stap.",
    query: LAUNCH_TRENDS_QUERY,
    layout: { sm: { h: 5, w: 12, x: 0, y: 5 } },
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
    console.log(`Insight bestaat al: ${def.name} (${existing.short_id})`);
    return existing;
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
    console.log(`Dashboard bestaat al: ${name} (id ${existing.id})`);
    return existing;
  }
  const created = await api("/dashboards/", {
    method: "POST",
    body: JSON.stringify({
      name,
      description: "Structuro launch: registratie-funnel en dagelijkse pulse.",
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

  const dashboard = await ensureDashboard("Structuro Launch", insightRows);
  const url = `${HOST}/project/${PROJECT_ID}/dashboard/${dashboard.id}`;
  console.log(`\nDashboard: ${url}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
