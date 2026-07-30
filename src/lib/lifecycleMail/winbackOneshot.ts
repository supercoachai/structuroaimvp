import type { LifecycleCandidate, LifecycleTemplateId } from "./types";

/** Soft winback one-shot: alleen accounts sinds live-go (1 jun 2026 NL). */
export const WINBACK_ONESHOT_MIN_CREATED_AT = "2026-06-01T00:00:00+02:00";

const PAID_OR_TRIALING = new Set(["active", "trialing"]);

export type WinbackSegment = "never_started" | "warm" | "engaged";

export type WinbackOneshotPick = {
  segment: WinbackSegment;
  templateId: LifecycleTemplateId;
  checkinCount: number;
};

const INTERNAL_EMAIL_RE = /@(structuro\.(eu|ai|test)|structuro\.local)$/i;

/** Hard excludes for soft winback (one-shot). */
export function isWinbackOneshotExcludedEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e || !e.includes("@")) return true;
  if (e === "info@structuro.eu") return true;
  if (e === "info@jasperbuitenhuis.nl") return true;
  if (INTERNAL_EMAIL_RE.test(e)) return true;
  return false;
}

export function winbackSegmentForCheckins(checkinCount: number): WinbackSegment {
  if (checkinCount <= 0) return "never_started";
  if (checkinCount === 1) return "warm";
  return "engaged";
}

export function templateForWinbackSegment(
  segment: WinbackSegment
): LifecycleTemplateId {
  switch (segment) {
    case "never_started":
      return "s_winback_never_started";
    case "warm":
      return "s_winback_warm";
    case "engaged":
      return "s6_winback";
    default: {
      const _e: never = segment;
      throw new Error(`Onbekend winback-segment: ${_e}`);
    }
  }
}

/**
 * Of deze candidate in de soft winback one-shot hoort.
 * Geen cron-eligibility: aparte one-shot batch.
 */
export function pickWinbackOneshot(
  c: Pick<
    LifecycleCandidate,
    | "email"
    | "created_at"
    | "subscription_status"
    | "unsubscribe_lifecycle"
    | "is_test"
    | "checkin_count"
  >,
  opts?: {
    minCreatedAt?: string;
    /** Extra hard excludes (protected testaccount e.d.). */
    excludeEmails?: Iterable<string>;
  }
): WinbackOneshotPick | null {
  if (c.is_test) return null;
  if (c.unsubscribe_lifecycle) return null;
  if (!c.email?.trim()) return null;
  if (isWinbackOneshotExcludedEmail(c.email)) return null;

  const exclude = new Set(
    [...(opts?.excludeEmails ?? [])].map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
  if (exclude.has(c.email.trim().toLowerCase())) return null;

  const status = (c.subscription_status ?? "").toLowerCase();
  if (PAID_OR_TRIALING.has(status)) return null;
  if (status !== "trial_expired") return null;

  const minIso = opts?.minCreatedAt ?? WINBACK_ONESHOT_MIN_CREATED_AT;
  const created = new Date(c.created_at).getTime();
  const min = new Date(minIso).getTime();
  if (Number.isNaN(created) || created < min) return null;

  const checkinCount = Math.max(0, c.checkin_count ?? 0);
  const segment = winbackSegmentForCheckins(checkinCount);
  return {
    segment,
    templateId: templateForWinbackSegment(segment),
    checkinCount,
  };
}
