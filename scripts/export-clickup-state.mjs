#!/usr/bin/env node
/**
 * Genereert plakklare inhoud voor ClickUp Doc "Structuro State (live)" uit Obsidian.
 *
 * Leest:
 *   - Structuro State.md (prioriteiten, snapshot, open vragen)
 *   - 06 Cijfers/Huidige cijfers.md (business + activatie detail)
 *   - 05 Operaties/ClickUp/ClickUp operationele sync.md (taken + waarheid)
 *
 * Schrijft:
 *   - Obsidian: 05 Operaties/ClickUp/Structuro State LIVE paste.md
 *   - Obsidian: werkt Doc-inhoud-sectie in Structuro State ClickUp Doc.md bij
 *   - Obsidian: ## ClickUp sync footer in Structuro State.md
 *
 *   npm run export:clickup-state
 *   VAULT_PATH=/pad/naar/vault node scripts/export-clickup-state.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_VAULT = join(process.env.HOME || "", "Documents/Obsidian Vault");
const VAULT = process.env.VAULT_PATH || DEFAULT_VAULT;

const PATHS = {
  state: join(VAULT, "Structuro State.md"),
  metrics: join(VAULT, "06 Cijfers/Huidige cijfers.md"),
  opsSync: join(
    VAULT,
    "05 Operaties/ClickUp/ClickUp operationele sync.md"
  ),
  clickupNote: join(VAULT, "05 Operaties/ClickUp/Structuro State ClickUp Doc.md"),
  pasteOut: join(VAULT, "05 Operaties/ClickUp/Structuro State LIVE paste.md"),
};

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function read(path) {
  if (!existsSync(path)) die(`Bestand niet gevonden: ${path}`);
  return readFileSync(path, "utf8");
}

function readOptional(path) {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function body(md) {
  return md.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

function extractSection(md, headingPattern) {
  const re = new RegExp(`^##\\s+${headingPattern}`, "m");
  const m = md.match(re);
  if (!m || m.index === undefined) return "";
  const from = m.index;
  const afterHeading = from + m[0].length;
  const next = md.indexOf("\n## ", afterHeading);
  const end = next === -1 ? md.length : next;
  return md.slice(from, end).trim();
}

function extractPriorities(stateBody) {
  const sec = extractSection(stateBody, "🎯 Prioriteiten[^\\n]*");
  if (!sec) return null;
  const lines = sec
    .split("\n")
    .slice(1)
    .filter((l) => /^\d+\./.test(l.trim()));
  return lines.length ? lines.join("\n") : null;
}

function parseMarkdownTable(section) {
  const rows = [];
  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    if (/^\|[\s\-:|]+\|/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 2) continue;
    if (cells[0].toLowerCase() === "metric") continue;
    rows.push({ key: cells[0], value: cells[1] });
  }
  return rows;
}

function parseMarkdownTableRows(section) {
  const rows = [];
  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    if (/^\|[\s\-:|]+\|/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 2) continue;
    if (cells[0].toLowerCase() === "metric") continue;
    rows.push(cells);
  }
  return rows;
}

function extractSnapshotTable(stateBody) {
  const sec = extractSection(stateBody, "📊 Snapshot metrics");
  return parseMarkdownTable(sec);
}

function extractTableFromSection(md, headingPattern) {
  const sec = extractSection(md, headingPattern);
  return parseMarkdownTable(sec);
}

function extractOpenQuestions(stateBody) {
  const sec = extractSection(stateBody, "❓ Open vragen");
  if (!sec) return [];
  return sec.split("\n").filter((l) => /^- \[[ xX]\]/.test(l.trim()));
}

function formatDateNl() {
  return new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

function formatDateTimeNl() {
  return new Date().toLocaleString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || /^\|[\s\-:|]+\|$/.test(trimmed)) {
    return null;
  }
  const inner = trimmed.slice(1, trimmed.endsWith("|") ? -1 : undefined);
  const cells = inner.split("|").map((c) => c.trim());
  if (!cells[0] || cells[0].toLowerCase() === "taak") return null;
  return cells;
}

function extractOpsSyncBullets(opsBody) {
  const sec = extractSection(opsBody, "Actuele taken \\(Structuro's List\\)");
  if (!sec) return "- (Geen operationele sync gevonden)";
  const lines = sec.split("\n");
  const bullets = [];
  for (const line of lines) {
    const cells = parseTableRow(line);
    if (!cells || cells.length < 3) continue;
    bullets.push(`- **${cells[0]}** (${cells[1]}): ${cells[2]}`);
  }
  if (!bullets.length) return "- (Geen taken in operationele sync)";
  return bullets.join("\n");
}

function extractMetricDefinitions(metricsBody) {
  const sec = extractSection(metricsBody, "Metric definities");
  if (!sec) return null;
  const bullets = sec
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .join("\n");
  return bullets || null;
}

function buildDoc({
  syncDate,
  syncDateTime,
  priorities,
  snapshotRows,
  metricsBody,
  openQuestions,
  opsSyncBullets,
  metricDefinitions,
}) {
  const snapshotKeys = new Set(snapshotRows.map((r) => r.key));
  const snapshotLines = snapshotRows
    .map((r) => `| ${r.key} | ${r.value} |`)
    .join("\n");

  const businessRows = extractTableFromSection(metricsBody, "Business[^\\n]*");
  const businessExtra = businessRows
    .filter((r) => !snapshotKeys.has(r.key))
    .map((r) => `| ${r.key} | ${r.value} |`)
    .join("\n");

  const activatieSec = extractSection(metricsBody, "Activatie \\(P0\\)");
  const activatieBullets = parseMarkdownTableRows(activatieSec)
    .map(([metric, waarde, doel]) => {
      const d = doel ? ` (doel ${doel})` : "";
      return `- ${metric}: ${waarde}${d}`;
    })
    .join("\n");

  const businessBullets = businessRows
    .filter((r) => !snapshotKeys.has(r.key))
    .map((r) => `- ${r.key}: ${r.value}`)
    .join("\n");

  const openBlock =
    openQuestions.length > 0
      ? openQuestions.join("\n")
      : "- (geen open vragen in Structuro State)";

  const metricBlock =
    metricDefinitions ||
    `- **Signup → dagstart (24u):** eerste dagstart binnen 24u na signup (P0 KPI)
- **Cohort onboarding/dagstart:** % accounts met onboarding af in jun-cohort (andere definitie, vaak hoger)
- **Ground truth:** Supabase; PostHog alleen aanvullend (ondertelling ~40%)`;

  return `### Meta

- **Laatst gesynced:** ${syncDateTime} (Europe/Amsterdam)
- **Datum export:** ${syncDate}
- **Master-bron:** Obsidian \`Structuro State.md\`
- **Repo:** \`/Users/nielsvandenhurk/structuroai-mvp\`
- **Niet in dit Doc:** TikTok scripts, Canva prompts, code, secrets

**Superagent leesregels:**
- Toets weekly comments aan **deze sync-datum**, niet aan oude comments.
- **ClickUp status ≠ bewezen productie.** Check repo/deploy + Supabase vóór "live = impact".
- Bij metric-twijfel: zie **Metric definities** hieronder; Supabase wint van PostHog.

---

### Wat is Structuro?

Executie-interface voor ADHD-breinen: energie-first, max 3 taken, geen streaks.

- Marketing: structuro.eu → App: structuro.ai
- Positionering: "Gebruik andere apps om bij te houden. Gebruik Structuro om het ook te doen."
- Geen planner, geen streaks, geen shame-gamification

---

### Prioriteiten

${priorities}

---

### Funnel & attributie (kritiek)

| Verkeer | Route | Nooit |
|---------|-------|-------|
| Organisch EU | \`/start\` | direct \`/registreren\`, \`/tiktok\` |
| TikTok | \`/tiktok\` | hardcoded TikTok-URL op organische CTAs |
| Legacy | \`/tiktok?utm_source=structuro_eu\` → redirect \`/start\` | |

**Meten:** \`cta_clicked → /start → signup_completed → dagstart_completed\`  
**Niet meer:** waitlist-events (uitgefaseerd jun 2026)

---

### Snapshot metrics

| Metric | Waarde |
|--------|--------|
${snapshotLines}
${businessExtra ? `${businessExtra}\n` : ""}

**Activatie detail (uit Huidige cijfers):**
${activatieBullets}

**Business detail:**
${businessBullets}

Detail: Obsidian \`06 Cijfers/Huidige cijfers\`, PostHog project 175224

---

### Metric definities

${metricBlock}

---

### ClickUp operationele waarheid

Laatste sync uit Obsidian \`05 Operaties/ClickUp/ClickUp operationele sync.md\`.

${opsSyncBullets}

**Let op:** Git/deploy kan vóór ClickUp-status bijgewerkt zijn. Repo = technische waarheid; ClickUp = beslis- en review-interface.

---

### Doctrine (Superagent: hybride handhaving)

**Hard veto (security/AVG/auth/data):** weiger, leg uit, stel veilig alternatief voor.

**Product-doctrines (sterk afraden, experiment mag met label):**
- Geen neurotypische defaults als norm
- Prikkelarm, geen streak-shame
- Executie-interface, geen admin-heavy onboarding
- Empirische firewall: meten vóór schalen
- Amnestische backlog: elke dag begint leeg

**Experiment-label:** subtask \`Experiment – wijkt af van [doctrine X]\`

---

### Core loop

1. Dagstart: energie → max 3 focuspunten
2. Focus modus: één taak, microstappen
3. Shutdown: dag afsluiten, geen backlog-guilt

---

### Open vragen

${openBlock}

---

### Waar detail staat (Obsidian hubs)

| Onderwerp | Hub |
|-----------|-----|
| Doctrine | 00 Doctrine |
| Product / activatie | 02 Product |
| Groei / TikTok | 03 Groei |
| Tech / deploy | 04 Tech |
| Metrics / PostHog | 06 Cijfers |
| Cyclus / hormonen | 02 Product / Cyclus Hub |
| Interviews | 01 Interviews |
| Kennisdossier | 09 AI Context / Kennisdossier |

Vraag Niels om Obsidian-export als je detail nodig hebt buiten dit Doc.

---

### Superagent: wat jij wél/niet doet

**Wel:** wekelijkse funnel review, security check, doctrine sanity, task-created review op Structuro's List

**Niet:** TikTok scripts, Canva, social metrics → Structuro Social Manager

**Bij weekly reviews ook:** git/deploy-check voor "live"-claims; noem metric-definitie expliciet.
`;
}

function updateClickupNote(docContent) {
  const note = read(PATHS.clickupNote);
  const startMarker = "## Doc-inhoud (kopieer vanaf hier naar ClickUp)";
  const endMarker = "### Einde Doc-inhoud";

  const startIdx = note.indexOf(startMarker);
  const endIdx = note.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    console.warn(
      "⚠️  Markers niet gevonden in ClickUp Doc note; alleen paste-bestand geschreven."
    );
    return;
  }

  const before = note.slice(0, startIdx + startMarker.length);
  const after = note.slice(endIdx);
  const newNote =
    before + "\n\n---\n\n" + docContent + "\n\n---\n\n" + after;

  writeFileSync(PATHS.clickupNote, newNote, "utf8");
}

function patchStateSyncFooter(syncDateTime) {
  let content = read(PATHS.state);
  const marker = "## ClickUp sync";
  const block = `## ClickUp sync

- **Laatst gesynced:** ${syncDateTime} (Europe/Amsterdam)
- **Script:** \`npm run export:clickup-state\` in repo
- **ClickUp Doc:** Structuro State (live)
- **Operationele taken:** [[05 Operaties/ClickUp/ClickUp operationele sync|ClickUp operationele sync]]
`;

  if (content.includes(marker)) {
    content = content.replace(
      /^## ClickUp sync[\s\S]*$/m,
      block.trimEnd()
    );
  } else {
    content = `${content.trimEnd()}\n\n${block}`;
  }

  writeFileSync(PATHS.state, content, "utf8");
}

function main() {
  console.log(`Vault: ${VAULT}`);

  const stateBody = body(read(PATHS.state));
  const metricsBody = body(read(PATHS.metrics));
  const opsBody = body(readOptional(PATHS.opsSync));

  const priorities =
    extractPriorities(stateBody) ||
    "1. **P0 Activatie:** signup → dagstart\n2. **P1 Acquisitie:** `/start` organic, `/tiktok` social\n3. Geen paid TikTok tot activatie >25%";

  const snapshotRows = extractSnapshotTable(stateBody);
  if (!snapshotRows.length) {
    die("Geen snapshot-metrics tabel gevonden in Structuro State.md");
  }

  const openQuestions = extractOpenQuestions(stateBody);
  const syncDate = formatDateNl();
  const syncDateTime = formatDateTimeNl();

  const docContent = buildDoc({
    syncDate,
    syncDateTime,
    priorities,
    snapshotRows,
    metricsBody,
    openQuestions,
    opsSyncBullets: extractOpsSyncBullets(opsBody),
    metricDefinitions: extractMetricDefinitions(metricsBody),
  });

  const pasteFile = `---
tags:
  - clickup-export
hub: "[[05 Operaties/ClickUp/ClickUp Hub|ClickUp Hub]]"
type: clickup-export
---

# Structuro State (live) — plak in ClickUp

Terug naar: [[ClickUp Hub]] · [[Structuro State ClickUp Doc]]

> Gegenereerd: ${syncDateTime}. Kopieer alles vanaf \`### Meta\` naar ClickUp Doc **Structuro State (live)**.
> Script: \`npm run export:clickup-state\`
> Niet in de strategische graph (tag \`#clickup-export\`).

---

${docContent}
`;

  writeFileSync(PATHS.pasteOut, pasteFile, "utf8");
  updateClickupNote(docContent);
  patchStateSyncFooter(syncDateTime);

  console.log("✅ ClickUp State export klaar");
  console.log(`   Plakbestand: ${PATHS.pasteOut}`);
  console.log(`   ClickUp note bijgewerkt: ${PATHS.clickupNote}`);
  console.log(`   Structuro State footer bijgewerkt`);
  console.log(`   Laatst gesynced: ${syncDateTime}`);
  console.log("");
  console.log("Volgende stap: plak naar ClickUp Doc of laat Cursor de Doc via MCP updaten.");
}

main();
