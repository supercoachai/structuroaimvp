#!/usr/bin/env node
/**
 * Dient sitemap-URL's in bij IndexNow (Bing en andere deelnemende zoekmachines).
 * De sleutel moet live staan op https://www.structuro.eu/{key}.txt
 *
 *   node scripts/indexnow-submit.mjs
 *   node scripts/indexnow-submit.mjs --app
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANDING = join(ROOT, "structuro-eu-landing");
const KEY = "8d59491603984060b0f3eb025fea688d";
const EU_HOST = "www.structuro.eu";
const AI_HOST = "www.structuro.ai";
const includeApp = process.argv.includes("--app");
const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function isAccepted(status) {
  return status === 200 || status === 202;
}

async function readLiveKey(host) {
  const url = `https://${host}/${KEY}.txt`;
  const res = await fetch(url, { redirect: "manual" });
  const body = (await res.text()).trim();
  return { url, status: res.status, body, ok: res.status === 200 && body === KEY };
}

async function submit({ host, urlList }) {
  const payload = {
    host,
    key: KEY,
    keyLocation: `https://${host}/${KEY}.txt`,
    urlList,
  };
  const results = [];
  for (const endpoint of ENDPOINTS) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    results.push({ endpoint, status: res.status, text });
  }
  return results;
}

function printResults(rows) {
  for (const row of rows) {
    console.log(`  POST ${row.endpoint} → ${row.status}${row.text ? ` ${row.text}` : ""}`);
  }
}

async function main() {
  const fileKey = readFileSync(join(LANDING, `${KEY}.txt`), "utf8").trim();
  if (fileKey !== KEY) {
    console.error("IndexNow-sleutelbestand komt niet overeen met de verwachte sleutel.");
    process.exit(1);
  }

  const euKey = await readLiveKey(EU_HOST);
  if (!euKey.ok) {
    console.error(
      `Sleutel niet live op ${euKey.url} (HTTP ${euKey.status}). Deploy eerst structuro.eu.`,
    );
    process.exit(1);
  }

  const sitemap = readFileSync(join(LANDING, "sitemap.xml"), "utf8");
  const euUrls = locs(sitemap);
  if (euUrls.length === 0) {
    console.error("Geen URL's in sitemap.xml");
    process.exit(1);
  }

  console.log(`IndexNow: ${euUrls.length} URL's voor ${EU_HOST}`);
  const eu = await submit({ host: EU_HOST, urlList: euUrls });
  printResults(eu);

  if (includeApp) {
    const aiKey = await readLiveKey(AI_HOST);
    if (!aiKey.ok) {
      console.error(
        `Sleutel niet live op ${aiKey.url} (HTTP ${aiKey.status}). Deploy eerst structuro.ai.`,
      );
      process.exit(1);
    }
    const aiSitemap = await fetch(`https://${AI_HOST}/sitemap.xml`);
    const aiXml = await aiSitemap.text();
    const aiUrls = locs(aiXml);
    if (aiUrls.length === 0) {
      console.error("Geen URL's in structuro.ai sitemap");
      process.exit(1);
    }
    console.log(`IndexNow: ${aiUrls.length} URL's voor ${AI_HOST}`);
    const ai = await submit({ host: AI_HOST, urlList: aiUrls });
    printResults(ai);
    if (ai.some((row) => !isAccepted(row.status))) process.exit(1);
  }

  if (eu.some((row) => !isAccepted(row.status))) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
