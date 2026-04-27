/** Leest geneste keys zoals `settings.title` uit een vertaalboom. */
export function resolveMessage(tree: unknown, path: string): string {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = tree;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : path;
}
