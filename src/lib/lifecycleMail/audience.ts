/**
 * Lifecycle-mail bereik. Standaard UIT voor v1-productiegebruikers.
 *
 * - off: niets doen (geen sends, geen candidate-scan)
 * - test: alleen is_test / allowlist / protected testaccount
 * - all: echte cohort (pas bij bewuste v1-launch)
 */
export type LifecycleMailAudience = "off" | "test" | "all";

export function resolveLifecycleMailAudience(): LifecycleMailAudience {
  const raw = (process.env.LIFECYCLE_MAIL_AUDIENCE ?? "off").trim().toLowerCase();
  if (raw === "test" || raw === "all" || raw === "off") return raw;
  return "off";
}

export function lifecycleMailSendsEnabled(): boolean {
  return (
    process.env.LIFECYCLE_MAIL_ENABLED === "1" ||
    process.env.LIFECYCLE_MAIL_ENABLED === "true"
  );
}

/** Comma-separated emails die bij audience=test wél mogen. */
export function lifecycleMailTestAllowlist(): Set<string> {
  const raw = process.env.LIFECYCLE_MAIL_TEST_ALLOWLIST?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}
