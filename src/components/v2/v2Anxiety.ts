import { v2FindThingBankItemByTitle } from "./v2ThingBank";

/** Titels die shame/avoidance triggeren: niet als default "Structuro stelt voor". */
const ANXIETY_TITLE_RE =
  /\b(belasting|belastingaangifte|deurwaarder|incasso|schuld|rechtszaak|boete|ontslag|uitkering|tax\s*return|debt\s*collector|collections?|lawsuit|fine|fired|dismissal|benefits?\s*claim)\b/i;

export function v2IsAnxietyTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return false;
  const bank = v2FindThingBankItemByTitle(trimmed);
  if (bank?.anxiety) return true;
  return ANXIETY_TITLE_RE.test(trimmed);
}
