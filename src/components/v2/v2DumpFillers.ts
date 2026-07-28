/**
 * Strip spoken fillers / thinking sounds from dump transcripts (NL + EN).
 * Never drops real short tasks like "was" or "mail".
 */

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Multi-word thinking phrases (longest first). Stripped mid-phrase and as whole items. */
const THINKING_PHRASES: string[] = [
  // NL
  "laat me even nadenken",
  "laat me even denken",
  "laat me nadenken",
  "laat me denken",
  "even nadenken",
  "even denken",
  "even kijken",
  "wacht even",
  "hoe heet het",
  "hoe zeg je dat",
  "zeg maar",
  "ja eh",
  "nou ja",
  "of zo",
  // EN
  "let me think for a second",
  "let me think for a minute",
  "let me think",
  "wait a second",
  "wait a minute",
  "what's it called",
  "what is it called",
  "how do you say",
  "you know what i mean",
  "you know",
  "i mean",
  "kind of",
  "sort of",
].sort((a, b) => b.length - a.length);

/**
 * Hesitation sounds always safe to strip as whole tokens.
 * Deliberately excludes Dutch "er" (meaning "there") and short content words.
 */
const SOUND_TOKEN_RE =
  /(?:^|\s)(?:uhm+|ehm+|erm+|erh+|uh+|um+|eh+|hmm+|m{2,})(?=\s|$|[.,!?…])/gi;

/**
 * Affirmations / discourse markers that are fillers only when they are the
 * entire item (after other cleanup). Never includes "was", "mail", etc.
 */
const ALONE_FILLERS = new Set([
  // NL
  "ja",
  "nee",
  "nou",
  "dus",
  "eigenlijk",
  "oké",
  "oke",
  "okay",
  "ok",
  "goed",
  "prima",
  "tuurlijk",
  "natuurlijk",
  "tja",
  "ach",
  "oh",
  "ah",
  "nouja",
  "hè",
  "he",
  // EN
  "yeah",
  "yep",
  "yup",
  "yes",
  "no",
  "nope",
  "so",
  "well",
  "right",
  "wait",
  "like",
  "okay",
  "ok",
  "alright",
  "all right",
  "er",
  "ah",
  "oh",
]);

function stripThinkingPhrases(text: string): string {
  let s = text;
  for (const phrase of THINKING_PHRASES) {
    const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "gi");
    s = s.replace(re, " ");
  }
  return s;
}

function stripSoundTokens(text: string): string {
  return text.replace(SOUND_TOKEN_RE, " ");
}

function stripEdgeConnectors(text: string): string {
  return normalizeWhitespace(
    text
      .replace(/^(?:en|and|dan|then|plus|ook|also|or|of)\s+/i, "")
      .replace(/\s+(?:en|and|dan|then|plus|ook|also|or|of)$/i, "")
      .replace(/^[,;:.\-–—…]+/, "")
      .replace(/[,;:.\-–—…]+$/, ""),
  );
}

/** Remove fillers from a phrase; may return empty string. */
export function stripSpeechFillers(raw: string): string {
  let s = normalizeWhitespace(raw);
  if (s.length === 0) return "";
  s = stripThinkingPhrases(s);
  s = stripSoundTokens(s);
  s = stripEdgeConnectors(s);
  // Second pass: leftover alone-filler words at edges ("ja, was" → keep was)
  s = s.replace(
    /^(?:ja|nou|dus|oké|oke|okay|ok|yeah|yep|yup|yes|so|well|right|like)\s*[,.]?\s+/i,
    "",
  );
  s = stripEdgeConnectors(s);
  return normalizeWhitespace(s);
}

function normalizeAloneKey(text: string): string {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[?!.,…]+$/g, "")
    .replace(/\u00a0/g, " ");
}

/** True when the whole string is only filler / thinking, not a real dump item. */
export function isFillerOnlyItem(raw: string): boolean {
  const stripped = stripSpeechFillers(raw);
  if (stripped.length === 0) return true;
  const key = normalizeAloneKey(stripped);
  if (ALONE_FILLERS.has(key)) return true;
  // Pure sound leftovers the stripper might leave oddly cased
  if (/^(?:uh+|uhm+|um+|ehm+|eh+|hmm+|m{2,}|erm+|erh+)$/i.test(key)) return true;
  return false;
}

/**
 * Prepare dump candidates: strip fillers, split list, drop empty/filler items.
 * Returns [] when nothing real remains (e.g. only "uh" / "even denken").
 */
export function prepareDumpItems(
  raw: string,
  split: (text: string) => string[],
): string[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return [];

  const pre = stripSpeechFillers(trimmed);
  if (pre.length === 0 || isFillerOnlyItem(pre)) return [];

  const pieces = split(pre);
  const out: string[] = [];
  for (const piece of pieces) {
    const cleaned = stripSpeechFillers(piece);
    if (cleaned.length === 0 || isFillerOnlyItem(cleaned)) continue;
    if (
      out.length > 0 &&
      out[out.length - 1].toLowerCase() === cleaned.toLowerCase()
    ) {
      continue;
    }
    out.push(cleaned);
  }
  return out;
}
