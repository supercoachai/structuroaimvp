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

export async function fetchMicroStepSuggestions(
  input: FetchMicroStepSuggestionsInput
): Promise<FetchMicroStepSuggestionsResult> {
  const res = await fetch("/api/ai/suggest-micro-steps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title.trim(),
      energyLevel: input.energyLevel ?? undefined,
      durationMin: input.durationMin ?? undefined,
      locale: input.locale ?? "nl",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    steps?: string[];
    source?: "template" | "ai";
    remaining?: number;
    limit?: number;
  };

  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (res.status === 429 || data.error === "rate_limited") {
    throw new Error("rate_limited");
  }
  if (res.status === 503 || data.error === "ai_not_configured") {
    throw new Error("ai_not_configured");
  }
  if (!res.ok || !data.ok || !Array.isArray(data.steps) || data.steps.length === 0) {
    throw new Error(data.error ?? "generation_failed");
  }

  return {
    steps: data.steps.map((s) => String(s).trim()).filter(Boolean),
    source: data.source === "template" ? "template" : "ai",
    remaining: data.remaining,
    limit: data.limit,
  };
}
