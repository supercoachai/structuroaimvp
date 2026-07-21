/** Titels die shame/avoidance triggeren: niet als default "Structuro stelt voor". */
const ANXIETY_TITLE_RE =
  /\b(belasting|belastingaangifte|deurwaarder|incasso|schuld|rechtszaak|boete|ontslag|uitkering)\b/i;

export function v2IsAnxietyTitle(title: string): boolean {
  return ANXIETY_TITLE_RE.test(title.trim());
}
