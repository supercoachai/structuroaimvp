import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const LANDING = join(fileURLToPath(new URL("../..", import.meta.url)), "structuro-eu-landing");
const EM_DASH = "\u2014";
const TITLE_MAX = 60;
const DESC_MAX = 155;

function walkIndexHtml(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "v2" || name === "scripts" || name === "node_modules") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkIndexHtml(full, acc);
    else if (name === "index.html") acc.push(full);
  }
  return acc;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`, "i");
  const m = tag.match(re);
  return m ? m[1] : null;
}

function parsePage(html: string) {
  const head = html.slice(0, html.toLowerCase().indexOf("</head>"));
  const title = (head.match(/<title>([^<]*)<\/title>/i) || [, ""])[1].trim();
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  let robots = "";
  let desc: string | null = null;
  let twitter: string | null = null;
  for (const tag of metas) {
    const name = (attr(tag, "name") || "").toLowerCase();
    if (name === "robots") robots = attr(tag, "content") || "";
    if (name === "description") desc = attr(tag, "content");
    if (name === "twitter:card") twitter = attr(tag, "content");
  }
  let canonical: string | null = null;
  const hreflangs: string[] = [];
  for (const tag of links) {
    const rel = (attr(tag, "rel") || "").toLowerCase();
    if (rel === "canonical") canonical = attr(tag, "href");
    if (rel.split(/\s+/).includes("alternate") && attr(tag, "hreflang")) {
      hreflangs.push(attr(tag, "hreflang")!);
    }
  }
  return {
    title,
    desc,
    robots,
    twitter,
    canonical,
    hreflangs,
    noindex: robots.toLowerCase().includes("noindex"),
  };
}

describe("structuro.eu landing hygiene", () => {
  const files = walkIndexHtml(LANDING).filter((f) => !f.includes("/v2/"));
  const pages = files.map((file) => {
    const rel = file.slice(LANDING.length + 1);
    const html = readFileSync(file, "utf8");
    return { rel, html, ...parsePage(html) };
  });
  const indexable = pages.filter((p) => !p.noindex);
  const sitemap = readFileSync(join(LANDING, "sitemap.xml"), "utf8");

  it("heeft indexeerbare titles en descriptions binnen de limiet, zonder duplicaten", () => {
    const titles = new Map<string, string[]>();
    const descs = new Map<string, string[]>();
    for (const p of indexable) {
      expect(p.title, p.rel).toBeTruthy();
      expect(p.title.length, p.rel).toBeLessThanOrEqual(TITLE_MAX);
      expect(p.desc, p.rel).toBeTruthy();
      expect((p.desc || "").length, p.rel).toBeLessThanOrEqual(DESC_MAX);
      titles.set(p.title, [...(titles.get(p.title) || []), p.rel]);
      descs.set(p.desc!, [...(descs.get(p.desc!) || []), p.rel]);
    }
    for (const [title, rels] of titles) {
      expect(rels, `dup title ${title}`).toHaveLength(1);
    }
    for (const [desc, rels] of descs) {
      expect(rels, `dup desc ${desc.slice(0, 40)}`).toHaveLength(1);
    }
  });

  it("heeft canonical, hreflang en twitter:card op elke indexeerbare pagina", () => {
    for (const p of indexable) {
      expect(p.canonical, p.rel).toBeTruthy();
      expect(p.hreflangs, p.rel).not.toHaveLength(0);
      expect(p.twitter, p.rel).toBe("summary_large_image");
    }
  });

  it("houdt voor-coaches indexeerbaar en de sitemap compleet", () => {
    const coaches = pages.find((p) => p.rel === "voor-coaches/index.html");
    expect(coaches?.noindex).toBe(false);
    expect(coaches?.robots.toLowerCase()).toContain("index");
    expect(coaches?.robots.toLowerCase()).toContain("follow");
    expect(sitemap).toContain("https://www.structuro.eu/voor-coaches/");
    expect(sitemap).toContain("https://www.structuro.eu/adhd-bij-vrouwen/");
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThanOrEqual(40);
  });

  it("heeft geen em-dash in user-facing landing HTML", () => {
    for (const p of pages) {
      expect(p.html.includes(EM_DASH), p.rel).toBe(false);
    }
  });

  it("houdt Structured-H2 vrij van Tiimo-alternatief", () => {
    const page = pages.find((p) => p.rel === "structuro-of-structured/index.html");
    expect(page, "structured page").toBeTruthy();
    expect(page!.html).not.toContain("Tiimo-alternatief");
    expect(page!.html).toContain("Structured-alternatief");
  });

  it("zet Goblin-vergelijking in sitemap, hub en related", () => {
    expect(sitemap).toContain("https://www.structuro.eu/structuro-of-goblin-tools/");
    const goblin = pages.find((p) => p.rel === "structuro-of-goblin-tools/index.html");
    expect(goblin, "goblin page").toBeTruthy();
    expect(goblin!.html).toContain("goblin.tools");
    expect(goblin!.hreflangs).toEqual(expect.arrayContaining(["nl", "x-default"]));
    expect(goblin!.hreflangs).not.toContain("en");
    const hub = pages.find((p) => p.rel === "gidsen/index.html");
    expect(hub!.html).toContain("/structuro-of-goblin-tools/");
    const beste = pages.find((p) => p.rel === "beste-adhd-app-nederland/index.html");
    expect(beste!.html).toContain("/structuro-of-goblin-tools/");
    const taak = pages.find((p) => p.rel === "taakverlamming-adhd/index.html");
    expect(taak!.html).toContain("/structuro-of-goblin-tools/");
  });

  it("heeft de canonieke descriptor in Organization JSON-LD", () => {
    const needle =
      "Structuro is een Nederlandse, prikkelarme executie-app voor volwassenen die weten wat ze moeten doen, maar niet beginnen. Het is geen planner, behandeling of medisch hulpmiddel.";
    const adhdApp = pages.find((p) => p.rel === "adhd-app/index.html");
    expect(adhdApp!.html).toContain(needle);
    expect(adhdApp!.html).toContain('"@type": "Organization"');
    const coaches = pages.find((p) => p.rel === "voor-coaches/index.html");
    expect(coaches!.html).toContain(needle);
    const pers = pages.find((p) => p.rel === "pers/index.html");
    expect(pers!.html).toContain(needle);
  });

  it("zet groepsniveau-disclaimer op cluster B-gidsen", () => {
    const disclaimer =
      "Dit beschrijft patronen op groepsniveau. Het voorspelt niet wat voor één persoon geldt.";
    for (const rel of [
      "niet-kunnen-beginnen-adhd/index.html",
      "taakverlamming-adhd/index.html",
      "adhd-uitstelgedrag/index.html",
      "waarom-gewoon-beginnen-niet-werkt/index.html",
    ]) {
      const page = pages.find((p) => p.rel === rel);
      expect(page, rel).toBeTruthy();
      expect(page!.html, rel).toContain(disclaimer);
    }
  });

  it("linkt officiële productbronnen op de multi-productmatrix", () => {
    const beste = pages.find((p) => p.rel === "beste-adhd-app-nederland/index.html");
    expect(beste!.html).toContain("tiimoapp.com");
    expect(beste!.html).toContain("structured.app");
    expect(beste!.html).toContain("todoist.com");
    expect(beste!.html).toContain("goblin.tools");
    expect(beste!.html).toContain("focusmate.com");
    expect(beste!.html).toContain("Functies en prijzen gecontroleerd op 17 september 2026");
    expect(beste!.html).toContain("niet bevestigd");
  });

  it("heeft geen legacy /start CTA naar structuro.eu", () => {
    for (const p of pages) {
      expect(p.html, p.rel).not.toMatch(/https:\/\/(www\.)?structuro\.eu\/start/i);
    }
  });
});
