import { matchMicroStepTemplate } from "@/lib/ai/microStepTemplates";
import { createClient } from "@/lib/supabase/client";

export type FetchMicroStepSuggestionsInput = {
  title: string;
  energyLevel?: "low" | "medium" | "high" | null;
  durationMin?: number | null;
  locale?: "nl" | "en";
};

export type FetchMicroStepSuggestionsResult = {
  steps: string[];
  source: "template" | "ai";
  remaining?: number;
  limit?: number;
};

async function ensureSupabaseSession(): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return true;
    const { data, error } = await supabase.auth.refreshSession();
    return Boolean(data.session && !error);
  } catch {
    return false;
  }
}

export async function fetchMicroStepSuggestions(
  input: FetchMicroStepSuggestionsInput
): Promise<FetchMicroStepSuggestionsResult> {
  const title = input.title.trim();
  const locale = input.locale === "en" ? "en" : "nl";

  const template = matchMicroStepTemplate(title, locale);
  if (template) {
    return {
      steps: template.steps,
      source: "template",
    };
  }

  // Best-effort sessie verversen voor ingelogde users. Anonieme onboarding-users
  // mogen de AI-microstappen ook proberen; de API limiteert die per IP.
  await ensureSupabaseSession();

  const res = await fetch("/api/ai/suggest-micro-steps", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      energyLevel: input.energyLevel ?? undefined,
      durationMin: input.durationMin ?? undefined,
      locale,
    }),
  });

  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (res.redirected || res.type === "opaqueredirect") {
    throw new Error("request_blocked");
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("request_blocked");
  }

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    steps?: string[];
    source?: "template" | "ai";
    remaining?: number;
    limit?: number;
  };

  if (res.status === 429 || data.error === "rate_limited") {
    throw new Error("rate_limited");
  }
  if (res.status === 503 || data.error === "ai_not_configured") {
    throw new Error("ai_not_configured");
  }
  if (res.status === 500 && data.error === "quota_check_failed") {
    throw new Error("quota_check_failed");
  }
  if (!res.ok || !data.ok || !Array.isArray(data.steps) || data.steps.length === 0) {
    throw new Error(data.error ?? "generation_failed");
  }

  const steps = data.steps.map((s) => String(s).trim()).filter(Boolean);
  if (steps.length !== 4) {
    throw new Error("invalid_step_count");
  }

  return {
    steps,
    source: data.source === "template" ? "template" : "ai",
    remaining: data.remaining,
    limit: data.limit,
  };
}
