/**
 * Split a free-text dump (typed or spoken) into separate dump entries.
 * Heuristic only: no network, instant, Dutch + English list cues.
 */

import { prepareDumpItems as prepareWithFillers } from "./v2DumpFillers";

const SUBORDINATE_START =
  /^(dat|die|wie|wat|of|omdat|want|zodat|als|toen|terwijl|hoewel|maar|which|that|who|whom|because|if|when|while|although|but|so)\b/i;

const CONNECTOR_RE =
  /\s+(?:en|and|dan|then|plus|ook|also|daarna|afterwards|after\s+that)\s+/gi;

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function cleanItem(s: string): string {
  return normalizeWhitespace(
    s
      .replace(/^[\s•●▪‣*]+/, "")
      .replace(/^[-–—]\s+/, "")
      .replace(/^[(\[]?\d{1,2}[.)\]]\s*/, "")
      .replace(
        /^(?:ten\s+)?(?:eerste|tweede|derde|vierde|vijfde|zesde|zevende|achtste|negende|tiende)\s*[:.\-–]?\s*/i,
        "",
      )
      .replace(
        /^(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s*[:.\-–]?\s*/i,
        "",
      )
      .replace(/[,;:\s.]+$/, "")
      .replace(/^[,;:\s]+/, ""),
  );
}

function looksLikeListItem(part: string): boolean {
  const t = part.trim();
  if (t.length === 0 || t.length > 80) return false;
  if (SUBORDINATE_START.test(t)) return false;
  return true;
}

/**
 * Strong structural cues: newlines, semicolons, bullets, numbered markers,
 * spoken ordinals (ten eerste / first).
 */
function splitByStrongDelimiters(text: string): string[] {
  const byNewline = text.split(/\n+/);
  const bySemi = byNewline.flatMap((line) => line.split(/\s*;\s*/));
  const byBullet = bySemi.flatMap((chunk) =>
    chunk.split(/(?:^|\s+)(?:[•●▪‣]|(?:[-*]\s+))(?=\S)/),
  );
  const byNumber = byBullet.flatMap((chunk) =>
    chunk.split(/(?:^|\s+)\d{1,2}[.)]\s+(?=\S)/),
  );
  const byOrdinal = byNumber.flatMap((chunk) =>
    chunk.split(
      /(?:^|\s+)(?:ten\s+(?:eerste|tweede|derde|vierde|vijfde)|(?:first|second|third|fourth|fifth))\s*[:.\-]?\s+/i,
    ),
  );

  return byOrdinal.map(cleanItem).filter((p) => p.length > 0);
}

function maybeSplitCommaList(text: string): string[] {
  // "a, b en c" / "a, b, and c" → treat final en/and like a comma
  const normalized = text.replace(/\s*,\s*(?:en|and)\s+/gi, ", ");
  const parts = normalized.split(/\s*,\s+/).map(cleanItem).filter((p) => p.length > 0);
  if (parts.length < 2) return [text];

  if (parts.length === 2) {
    if (parts.every((p) => p.length <= 40 && looksLikeListItem(p))) return parts;
    return [text];
  }

  const ok = parts.filter((p) => looksLikeListItem(p)).length;
  if (ok >= Math.ceil(parts.length * 0.7)) return parts;
  return [text];
}

function maybeSplitConjunctionList(text: string): string[] {
  const parts = text
    .split(CONNECTOR_RE)
    .map(cleanItem)
    .filter((p) => p.length > 0);
  // Exactly two parts ("Bel mama en zeg…", "beter dan gisteren") stay one thought.
  // Three or more ("A en B en C") is a spoken list.
  if (parts.length < 3) return [text];

  const ok = parts.filter((p) => looksLikeListItem(p) && p.length <= 70).length;
  if (ok >= Math.ceil(parts.length * 0.65)) return parts;
  return [text];
}

/**
 * Split dump input into logical items. Always returns at least one item
 * for non-empty input (the original trimmed text as fallback).
 * Does not filter fillers; use {@link prepareDumpItems} for voice/typed save.
 */
export function splitDumpList(raw: string): string[] {
  const text = raw.trim();
  if (text.length === 0) return [];

  const strong = splitByStrongDelimiters(text);
  const expanded = strong.flatMap((chunk) => {
    const byComma = maybeSplitCommaList(chunk);
    return byComma.flatMap((piece) => maybeSplitConjunctionList(piece));
  });

  const out: string[] = [];
  for (const item of expanded) {
    const cleaned = cleanItem(item);
    if (cleaned.length === 0) continue;
    if (
      out.length > 0 &&
      out[out.length - 1].toLowerCase() === cleaned.toLowerCase()
    ) {
      continue;
    }
    out.push(cleaned);
  }

  return out.length > 0 ? out : [normalizeWhitespace(text)];
}

/** Strip fillers, split, drop empty/filler-only items. */
export function prepareDumpItems(raw: string): string[] {
  return prepareWithFillers(raw, splitDumpList);
}
