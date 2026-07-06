import type {
  ActivationFunnelEventName,
  ActivationFunnelServerPayload,
} from "@/lib/posthog/activationFunnelAnalytics";
import { ACQUISITION_VISITOR_UUID_RE } from "@/lib/posthog/parseAcquisitionPayload";

const ALLOWED_EVENTS = new Set<ActivationFunnelEventName>([
  "onboarding_started",
  "onboarding_completed",
  "dagstart_started",
  "dagstart_energy_chosen",
  "dagstart_completed",
]);

function sanitize(raw: unknown, max = 128): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, max).replace(/[^a-zA-Z0-9_\-./:?&=%]/g, "");
}

function sanitizeEnergy(raw: unknown): string | null {
  const v = sanitize(raw, 16).toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return null;
}

export type ParsedActivationFunnelRequest = {
  event: ActivationFunnelEventName;
  payload: ActivationFunnelServerPayload;
};

export function parseActivationFunnelPayload(
  body: unknown
): ParsedActivationFunnelRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const eventRaw = sanitize(b.event, 64);
  if (!ALLOWED_EVENTS.has(eventRaw as ActivationFunnelEventName)) return null;
  const event = eventRaw as ActivationFunnelEventName;

  const visitor_id = sanitize(b.visitor_id, 64);
  if (!ACQUISITION_VISITOR_UUID_RE.test(visitor_id)) return null;

  const energy_level = sanitizeEnergy(b.energy_level);
  if (
    (event === "dagstart_energy_chosen" || event === "dagstart_completed") &&
    !energy_level
  ) {
    return null;
  }

  const tasks_selected_count =
    typeof b.tasks_selected_count === "number" && Number.isFinite(b.tasks_selected_count)
      ? Math.max(0, Math.min(3, Math.floor(b.tasks_selected_count)))
      : null;

  return {
    event,
    payload: {
      visitor_id,
      signup_source: sanitize(b.signup_source as string) || null,
      utm_campaign: sanitize(b.utm_campaign as string) || null,
      is_tiktok: b.is_tiktok === true,
      energy_level,
      tasks_selected_count,
      has_cycle_phase: b.has_cycle_phase === true,
      duration_bucket: sanitize(b.duration_bucket as string, 32) || null,
      source: sanitize(b.source as string, 64) || null,
      funnel: sanitize(b.funnel as string, 32) || "activation",
    },
  };
}
