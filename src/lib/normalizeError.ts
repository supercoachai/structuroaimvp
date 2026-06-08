/** Maakt onbekende throws (zoals DOM Event) leesbaar voor boundaries en logging. */
export function normalizeError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (value instanceof Event) {
    const target = value.target as { src?: string; href?: string } | null;
    const src = target?.src ?? target?.href ?? value.type ?? "onbekend";
    return new Error(`Bron laden mislukt (${src})`);
  }
  if (typeof value === "string" && value.trim()) return new Error(value);
  if (value == null) return new Error("Onbekende fout");
  try {
    const asJson = JSON.stringify(value);
    if (asJson && asJson !== "{}") return new Error(asJson);
  } catch {
    /* ignore */
  }
  return new Error(String(value));
}

/** Webpack/HMR/chunk-fouten na deploy of hot reload. Eén automatische reload helpt. */
export function isRecoverableChunkError(reason: unknown): boolean {
  if (reason instanceof Event) return true;
  const msg =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : String(reason ?? "");
  return /chunk|moduleId|__webpack_modules__|dynamically imported|Loading CSS|Failed to fetch|import\(\)|is not a function|load failed|404|ENOENT/i.test(
    msg
  );
}
