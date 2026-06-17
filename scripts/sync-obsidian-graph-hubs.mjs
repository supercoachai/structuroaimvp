#!/usr/bin/env node
/**
 * Graph-gewicht voor exact 10 domein-hubs (zijbalk-mappen).
 * Alleen die hubs worden groot in de 2D graph; rest blijft klein.
 *
 *   npm run sync:obsidian-graph-hubs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DEFAULT_VAULT = join(process.env.HOME || "", "Documents/Obsidian Vault");
const VAULT = process.env.VAULT_PATH || DEFAULT_VAULT;

const MARKER_START = "<!-- graph-gewicht:start -->";
const MARKER_END = "<!-- graph-gewicht:end -->";

const SKIP_PATH_PARTS = [
  "_Archief",
  "99 Templates",
  "06 Cijfers/Dagrapporten",
];

/** Exact de 10 mappen uit de zijbalk — geen Structuro State, geen sub-hubs. */
const DOMAIN_HUBS = [
  { hub: "📥 Inbox/📥 Inbox.md", prefix: "📥 Inbox" },
  { hub: "00 Doctrine/Doctrine Hub.md", prefix: "00 Doctrine" },
  { hub: "01 Interviews/Interviews Hub.md", prefix: "01 Interviews" },
  { hub: "02 Product/Product Hub.md", prefix: "02 Product" },
  { hub: "03 Groei/Growth Hub.md", prefix: "03 Groei" },
  { hub: "04 Tech/Tech Hub.md", prefix: "04 Tech" },
  { hub: "05 Operaties/Operations Hub.md", prefix: "05 Operaties" },
  { hub: "06 Cijfers/Metrics Hub.md", prefix: "06 Cijfers" },
  { hub: "08 Juridisch/Juridisch Hub.md", prefix: "08 Juridisch" },
  { hub: "09 AI Context/AI Context Hub.md", prefix: "09 AI Context" },
];

const NO_INFLATION = ["Structuro State.md"];

const LINK_REPEAT = 5;
const TARGET_GRAPH_LINKS = 50;

function shouldSkipPath(relPath) {
  return SKIP_PATH_PARTS.some((part) => relPath.includes(part));
}

function walkMdFiles(dir, vaultRoot, hubRelPath) {
  const out = [];
  if (!existsSync(dir)) return out;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const rel = relative(vaultRoot, full);
      if (shouldSkipPath(rel)) continue;
      out.push(...walkMdFiles(full, vaultRoot, hubRelPath));
    } else if (entry.name.endsWith(".md")) {
      const rel = relative(vaultRoot, full).replace(/\\/g, "/");
      if (rel === hubRelPath) continue;
      if (shouldSkipPath(rel)) continue;
      out.push(rel.replace(/\.md$/, ""));
    }
  }
  return out.sort();
}

function buildWeightSection(linkPaths, hubRelPath) {
  const paths =
    linkPaths.length > 0
      ? linkPaths
      : [hubRelPath.replace(/\.md$/, "")];
  const repeat = Math.max(
    LINK_REPEAT,
    Math.ceil(TARGET_GRAPH_LINKS / paths.length),
  );
  const repeated = paths.flatMap((p) =>
    Array.from({ length: repeat }, () => p),
  );
  const links = repeated.map((p) => `[[${p}]]`).join(" ");
  return `${MARKER_START}
<details>
<summary>Graph navigatie (auto, niet openen)</summary>

${links}
</details>
${MARKER_END}`;
}

function removeHubSection(hubRelPath) {
  const fullPath = join(VAULT, hubRelPath);
  if (!existsSync(fullPath)) return;
  let content = readFileSync(fullPath, "utf8");
  if (!content.includes(MARKER_START)) return;
  const start = content.indexOf(MARKER_START);
  const end = content.indexOf(MARKER_END);
  if (end === -1) return;
  content =
    content.slice(0, start).trimEnd() +
    content.slice(end + MARKER_END.length);
  writeFileSync(fullPath, content, "utf8");
  console.log(`✓ ${hubRelPath} → graph-gewicht verwijderd`);
}

function upsertHubSection(hubRelPath, linkPaths) {
  const fullPath = join(VAULT, hubRelPath);
  if (!existsSync(fullPath)) {
    console.warn(`⚠️  Hub niet gevonden: ${hubRelPath}`);
    return;
  }

  const paths =
    linkPaths.length > 0
      ? linkPaths
      : [hubRelPath.replace(/\.md$/, "")];
  const repeat = Math.max(
    LINK_REPEAT,
    Math.ceil(TARGET_GRAPH_LINKS / paths.length),
  );

  const section = buildWeightSection(linkPaths, hubRelPath);
  let content = readFileSync(fullPath, "utf8");

  if (content.includes(MARKER_START)) {
    const start = content.indexOf(MARKER_START);
    const end = content.indexOf(MARKER_END);
    if (end === -1) {
      console.warn(`⚠️  Marker end missing in ${hubRelPath}`);
      return;
    }
    content =
      content.slice(0, start) +
      section +
      content.slice(end + MARKER_END.length);
  } else {
    content = content.trimEnd() + "\n\n" + section + "\n";
  }

  writeFileSync(fullPath, content, "utf8");
  console.log(
    `✓ ${hubRelPath} → ${linkPaths.length} notes (${paths.length * repeat} graph-links)`,
  );
}

function main() {
  console.log(`Vault: ${VAULT}`);

  for (const rel of NO_INFLATION) {
    removeHubSection(rel);
  }

  for (const { hub, prefix } of DOMAIN_HUBS) {
    const prefixDir = join(VAULT, prefix);
    const links = walkMdFiles(prefixDir, VAULT, hub);
    upsertHubSection(hub, links);
  }

  console.log("Klaar. Herlaad Obsidian graph (Cmd+R).");
}

main();
