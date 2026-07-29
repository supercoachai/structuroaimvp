import {
  isClientFunnelEvent,
  type ClientFunnelEventName,
} from "./clientFunnelAllowlist";
import type { ClientFunnelServerPayload } from "./clientFunnelAnalytics";
import { ACQUISITION_VISITOR_UUID_RE } from "./parseAcquisitionPayload";

const MAX_PROP_KEYS = 24;
const MAX_STRING = 128;

function sanitizeKey(raw: string): string | null {
  const key = raw.trim().slice(0, 64);
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return null;
  if (key.startsWith("$") && key !== "$pathname") return null;
  return key;
}

function sanitizeValue(raw: unknown): string | number | boolean | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(-1e9, Math.min(1e9, raw));
  }
  if (typeof raw === "string") {
    return raw.trim().slice(0, MAX_STRING);
  }
  return null;
}

export type ParsedClientFunnelRequest = {
  event: ClientFunnelEventName;
  payload: ClientFunnelServerPayload;
};

export function parseClientFunnelPayload(
  body: unknown
): ParsedClientFunnelRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const eventRaw = typeof b.event === "string" ? b.event.trim() : "";
  if (!isClientFunnelEvent(eventRaw)) return null;

  const visitor_id =
    typeof b.visitor_id === "string" ? b.visitor_id.trim().slice(0, 64) : "";
  if (!ACQUISITION_VISITOR_UUID_RE.test(visitor_id)) return null;

  const properties: Record<string, unknown> = {};
  const rawProps =
    b.properties && typeof b.properties === "object"
      ? (b.properties as Record<string, unknown>)
      : b;

  let count = 0;
  for (const [key, value] of Object.entries(rawProps)) {
    if (key === "event" || key === "visitor_id" || key === "properties") continue;
    const safeKey = sanitizeKey(key);
    if (!safeKey) continue;
    const safeVal = sanitizeValue(value);
    if (safeVal === null && value !== null) continue;
    properties[safeKey] = safeVal;
    count += 1;
    if (count >= MAX_PROP_KEYS) break;
  }

  return {
    event: eventRaw,
    payload: { visitor_id, properties },
  };
}
