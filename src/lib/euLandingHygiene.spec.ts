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

  it("host de IndexNow-sleutel als UTF-8-tekst op de site-root", () => {
    const key = "8d59491603984060b0f3eb025fea688d";
    const body = readFileSync(join(LANDING, `${key}.txt`), "utf8").trim();
    expect(body).toBe(key);
  });

  it("houdt voor-coaches indexeerbaar en de sitemap compleet", () => {
    const coaches = pages.find((p) => p.rel === "voor-coaches/index.html");
    expect(coaches?.noindex).toBe(false);
    expect(coaches?.robots.toLowerCase()).toContain("index");
    expect(coaches?.robots.toLowerCase()).toContain("follow");
    expect(sitemap).toContain("https://www.structuro.eu/voor-coaches/");
    expect(sitemap).toContain("https://www.structuro.eu/adhd-bij-vrouwen/");
    expect(sitemap).toContain("https://www.structuro.eu/body-doubling-adhd/");
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThanOrEqual(40);
  });

  it("toont op voor-coaches het home-dashboard en een echte aanvraag", () => {
    const coaches = pages.find((p) => p.rel === "voor-coaches/index.html");
    expect(coaches?.html).toContain('data-demo="home"');
    expect(coaches?.html).toContain("Nu aan de beurt");
    expect(coaches?.html).toContain("Wat jij ermee krijgt");
    expect(coaches?.html).toContain("/js/coach-form.js");
    expect(coaches?.html).not.toContain("geen verkoopdoel");
    expect(coaches?.html).not.toContain("opent je eigen mail");
    expect(coaches?.html).not.toContain("mailto:info@structuro.eu?subject=");
    expect(coaches?.html).not.toContain("Gebouwd met praktijkonderzoek");
    expect(coaches?.html).not.toContain("Gebouwd vanuit gesprekken over volle lijsten");
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
      "body-doubling-adhd/index.html",
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

  it("host fonts lokaal en vermijdt Google Fonts", () => {
    for (const p of indexable) {
      expect(p.html, p.rel).not.toContain("fonts.googleapis.com");
      expect(p.html, p.rel).not.toContain("fonts.gstatic.com");
      expect(p.html, p.rel).toContain("/css/fonts.css");
    }
  });

  it("verwijst externe bronnen naar finale 200-URL's, geen 3XX/4XX-hop", () => {
    for (const p of indexable) {
      expect(p.html, p.rel).not.toContain("https://tiimoapp.com/");
      expect(p.html, p.rel).not.toContain("https://www.tiimoapp.com/pricing");
      expect(p.html, p.rel).not.toContain("https://www.focusmate.com/pricing\"");
      expect(p.html, p.rel).not.toContain("onlinelibrary.wiley.com");
      expect(p.html, p.rel).not.toMatch(
        /linkedin\.com\/company\/structuro(?![-a-zA-Z0-9])/,
      );
    }
    const mentale = pages.find((p) => p.rel === "mentale-belasting-dagstart/index.html");
    expect(mentale!.html).toContain("https://dblp.org/rec/journals/cogsci/Sweller88");
    const beste = pages.find((p) => p.rel === "beste-adhd-app-nederland/index.html");
    expect(beste!.html).toContain("https://www.tiimoapp.com/");
    expect(beste!.html).toContain("https://www.tiimoapp.com/faq");
    expect(beste!.html).toContain("https://www.focusmate.com/pricing/");
  });

  it("zet zichtbare ankertekst op icoon-only externe links", () => {
    const cyclus = pages.find((p) => p.rel === "cyclus/index.html");
    expect(cyclus!.html).toContain('<span class="sr-only">Instagram</span>');
    expect(cyclus!.html).toContain('<span class="sr-only">TikTok</span>');
    expect(cyclus!.html).toContain('<span class="sr-only">LinkedIn</span>');
    expect(cyclus!.html).toContain("linkedin.com/company/structuro-ai");
    const coaches = pages.find((p) => p.rel === "voor-coaches/index.html");
    expect(coaches!.html).toContain('<span class="sr-only">Beluister op Spotify</span>');
  });

  it("heeft geen legacy /start CTA naar structuro.eu", () => {
    for (const p of pages) {
      expect(p.html, p.rel).not.toMatch(/https:\/\/(www\.)?structuro\.eu\/start/i);
    }
  });

  it("verwijst bronnen naar PubMed, niet naar doi.org 302s", () => {
    for (const p of indexable) {
      expect(p.html, p.rel).not.toContain("https://doi.org/");
    }
  });

  it("zet de primaire query in title, description, H1, lead, H2, strong, FAQ en img-alt", () => {
    const queries: Record<string, string> = {
      "niet-kunnen-beginnen-adhd/index.html": "ADHD paralysis",
      "taakverlamming-adhd/index.html": "taakverlamming ADHD",
      "tijdblindheid-adhd/index.html": "tijdblindheid ADHD",
      "overprikkeling-adhd/index.html": "overprikkeling ADHD",
      "adhd-planner-die-niet-overvraagt/index.html": "ADHD-planner",
      "beste-adhd-app-nederland/index.html": "beste ADHD-app",
      "alternatief-voor-todo-lijst-adhd/index.html": "to-do-lijst ADHD",
      "structuro-of-tiimo/index.html": "Structuro vs Tiimo",
      "structuro-of-structured/index.html": "Structuro vs Structured",
      "structuro-of-todoist/index.html": "Structuro vs Todoist",
      "structuro-of-goblin-tools/index.html": "Goblin Tools ADHD",
      "body-doubling-adhd/index.html": "body doubling ADHD",
      "adhd-en-burn-out/index.html": "ADHD burn-out",
      "adhd-op-het-werk/index.html": "ADHD op het werk",
      "adhd-ochtendroutine/index.html": "ADHD-ochtendroutine",
      "adhd-uitstelgedrag/index.html": "ADHD uitstelgedrag",
      "adhd-keuzestress/index.html": "ADHD keuzestress",
      "takenlijst-te-lang-adhd/index.html": "takenlijst ADHD",
      "adhd-focus-zonder-streaks/index.html": "ADHD-app zonder streaks",
      "adhd-bij-vrouwen/index.html": "ADHD bij vrouwen",
      "adhd-app/index.html": "ADHD-app",
      "executieve-functies-adhd/index.html": "executieve functies ADHD",
      "waarom-gewoon-beginnen-niet-werkt/index.html": "gewoon beginnen ADHD",
      "een-stap-per-dag/index.html": "één stap per dag ADHD",
      "waarom-planners-falen/index.html": "waarom planners falen",
      "mentale-belasting-dagstart/index.html": "mentale belasting ADHD",
      "energie-first/index.html": "energie-first ADHD",
      "en/best-adhd-apps-netherlands/index.html": "best ADHD app",
      "en/structuro-vs-tiimo/index.html": "Structuro vs Tiimo",
      "en/structuro-vs-structured/index.html": "Structuro vs Structured",
      "en/structuro-vs-todoist/index.html": "Structuro vs Todoist",
    };
    const fold = (s: string) =>
      s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (const [rel, query] of Object.entries(queries)) {
      const page = pages.find((p) => p.rel === rel);
      expect(page, rel).toBeTruthy();
      const html = page!.html;
      const q = fold(query);
      expect(fold(page!.title), `${rel} title`).toContain(q);
      expect(fold(page!.desc || ""), `${rel} description`).toContain(q);
      const h1 = (html.match(/<h1>([\s\S]*?)<\/h1>/i) || [, ""])[1].replace(/<[^>]+>/g, "");
      expect(fold(h1), `${rel} h1`).toContain(q);
      const main = html.slice(html.toLowerCase().indexOf("<main"));
      const words = (main.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").match(/[A-Za-zÀ-ÿ0-9]+(?:['’-][A-Za-zÀ-ÿ0-9]+)*/g) || []).slice(0, 150);
      expect(fold(words.join(" ")), `${rel} first 150 words`).toContain(q);
      expect(fold(html), `${rel} h2`).toMatch(
        new RegExp(`<h2[^>]*>[^<]*${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
      );
      const strongs = [...html.matchAll(/<strong>([\s\S]*?)<\/strong>/gi)].map((m) =>
        fold(m[1].replace(/<[^>]+>/g, "")),
      );
      expect(strongs.some((s) => s.includes(q)), `${rel} strong`).toBe(true);
      expect(html, `${rel} faq`).toMatch(/faq|veelgestelde vragen/i);
      expect(fold(html), `${rel} faq query`).toContain(q);
      const alts = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => attr(m[0], "alt") || "");
      expect(alts.some((a) => fold(a).includes(q)), `${rel} img-alt`).toBe(true);
    }
  });
});
