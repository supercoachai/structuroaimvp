type TranslateFn = (key: string, vars?: Record<string, string>) => string;

export function microSuggestErrorMessage(error: unknown, t: TranslateFn): string {
  const code = error instanceof Error ? error.message : "generation_failed";
  if (code === "rate_limited") return t("newTask.microSuggestRateLimit");
  if (code === "unauthorized") return t("newTask.microSuggestLogin");
  if (code === "quota_check_failed" || code === "ai_not_configured") {
    return t("newTask.microSuggestUnavailable");
  }
  return t("newTask.microSuggestError");
}
