#!/usr/bin/env node
/**
 * Smoke-test alle app-routes + webpack-chunks (vangt leeg scherm door 404 JS).
 *
 *   BASE_URL=http://localhost:3000 node scripts/verify-routes.mjs
 */

import { APP_ROUTES, FORBIDDEN_HTML_MARKERS } from "./app-routes.mjs";

const base = (process.env.BASE_URL || process.env.SMOKE_BASE_URL || "").replace(
  /\/$/,
  ""
);

if (!base) {
  console.error("❌ Zet BASE_URL (bijv. http://localhost:3000)");
  process.exit(1);
}

const chunkCache = new Map();

function extractAssetUrls(html) {
  const urls = new Set();
  const patterns = [
    /\/_next\/static\/chunks\/[^"'\s)]+/g,
    /\/_next\/static\/css\/[^"'\s)]+/g,
    /\/_next\/static\/media\/[^"'\s)]+/g,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      urls.add(m[0].split("?")[0]);
    }
  }
  return [...urls];
}

async function fetchAsset(path) {
  if (chunkCache.has(path)) return chunkCache.get(path);
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const meta = { url, status: res.status, ok: res.ok };
  chunkCache.set(path, meta);
  return meta;
}

async function fetchPage(path, init = {}) {
  let url = `${base}${path}`;
  let hops = 0;
  let res;
  let text = "";

  while (hops < 10) {
    res = await fetch(url, { redirect: "manual", ...init });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = loc.startsWith("http")
        ? loc
        : `${base}${loc.startsWith("/") ? loc : `/${loc}`}`;
      hops += 1;
      continue;
    }
    text = await res.text().catch(() => "");
    break;
  }

  const finalPath = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return path;
    }
  })();

  return {
    url: `${base}${path}`,
    finalUrl: url,
    finalPath,
    status: res?.status ?? 0,
    hops,
    text,
    ok: Boolean(res?.ok),
  };
}

function resolveNeedles(route, finalPath) {
  if (finalPath === "/login" || finalPath.startsWith("/login/")) {
    return ["structuro"];
  }
  return route.needles ?? [];
}

function assertStatusAllowed(meta, allowed, label) {
  if (!allowed.includes(meta.status)) {
    throw new Error(
      `${label}: verwacht ${allowed.join("|")}, kreeg ${meta.status} → ${meta.url}`
    );
  }
}

function assertNoForbiddenHtml(html, label) {
  const lower = html.toLowerCase();
  for (const marker of FORBIDDEN_HTML_MARKERS) {
    if (lower.includes(marker)) {
      throw new Error(`${label}: verboden marker "${marker}" in HTML`);
    }
  }
}

function assertNeedles(html, needles, label) {
  if (!needles?.length) return;
  const lower = html.toLowerCase();
  const hit = needles.some((n) => lower.includes(n.toLowerCase()));
  if (!hit) {
    throw new Error(
      `${label}: geen van [${needles.join(", ")}] gevonden in HTML`
    );
  }
}

async function verifyChunks(html, label) {
  const assets = extractAssetUrls(html);
  if (assets.length === 0) {
    throw new Error(`${label}: geen /_next/static assets in HTML (kapotte shell?)`);
  }
  const failed = [];
  for (const asset of assets) {
    const meta = await fetchAsset(asset);
    if (meta.status !== 200) {
      failed.push(`${asset} → HTTP ${meta.status}`);
    }
  }
  if (failed.length) {
    throw new Error(
      `${label}: ${failed.length} asset(s) ontbreken:\n  ${failed.slice(0, 8).join("\n  ")}${failed.length > 8 ? `\n  … +${failed.length - 8} meer` : ""}`
    );
  }
}

console.log(`\n🔍 Route verify → ${base} (${APP_ROUTES.length} routes)\n`);

let failed = 0;

for (const route of APP_ROUTES) {
  const label = `${route.method || "GET"} ${route.path}`;
  process.stdout.write(`• ${label} … `);
  try {
    const init =
      route.method && route.method !== "GET"
        ? {
            method: route.method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          }
        : {};

    const meta = await fetchPage(route.path, init);
    const allowed =
      route.status ??
      (route.kind === "api" ? [200, 401, 404, 405, 503] : [200]);
    assertStatusAllowed(meta, allowed, label);

    if (meta.status >= 500 && !allowed.includes(meta.status)) {
      throw new Error(`${label}: serverfout HTTP ${meta.status}`);
    }

    if (route.kind === "api") {
      console.log("✅");
      continue;
    }

    assertNoForbiddenHtml(meta.text, label);
    const needles = resolveNeedles(route, meta.finalPath);
    assertNeedles(meta.text, needles, label);

    if (route.verifyChunks && meta.text) {
      await verifyChunks(meta.text, label);
    }

    const hopNote = meta.hops > 0 ? ` → ${meta.finalPath}` : "";
    console.log(`✅${hopNote}`);
  } catch (err) {
    failed += 1;
    console.log("❌");
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${msg.split("\n").join("\n  ")}`);
  }
}

console.log(
  failed
    ? `\n${failed} route(s) gefaald.\n`
    : `\nAlle ${APP_ROUTES.length} routes geslaagd.\n`
);

process.exit(failed ? 1 : 0);
