import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveMicroStepsModel } from "@/lib/ai/microStepsModel";

export type SuggestMicroStepsInput = {
  title: string;
  energyLevel?: "low" | "medium" | "high" | null;
  durationMin?: number | null;
  locale?: "nl" | "en";
};

export type SuggestMicroStepsResult = {
  steps: string[];
  source: "template" | "ai";
  model?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

const microStepsSchema = z.object({
  steps: z
    .array(
      z
        .string()
        .min(2)
        .max(120)
        .describe("Korte, concrete actie in imperatief of werkwoord")
    )
    .length(4),
});

function energyLabel(
  energy: SuggestMicroStepsInput["energyLevel"],
  locale: "nl" | "en"
): string {
  if (energy === "low") return locale === "en" ? "low energy" : "lage energie";
  if (energy === "high") return locale === "en" ? "high energy" : "hoge energie";
  return locale === "en" ? "medium energy" : "normale energie";
}

function buildPrompt(input: SuggestMicroStepsInput): string {
  const locale = input.locale === "en" ? "en" : "nl";
  const title = input.title.trim();
  const duration =
    typeof input.durationMin === "number" && input.durationMin > 0
      ? input.durationMin
      : null;
  const energy = energyLabel(input.energyLevel, locale);

  if (locale === "en") {
    return [
      "Split this task into exactly 4 micro-steps for someone with ADHD.",
      "Rules:",
      "- Each step is one small physical or mental action",
      "- Use short, clear language (max 12 words per step)",
      "- First step must be very easy to start (under 2 minutes)",
      "- Steps follow a logical order",
      "- No numbering in the text",
      `- Energy level: ${energy}`,
      duration ? `- Total task duration about ${duration} minutes` : "",
      `Task: "${title}"`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Splits deze taak in precies 4 microstappen voor iemand met ADHD.",
    "Regels:",
    "- Elke stap is één kleine fysieke of mentale actie",
    "- Korte, duidelijke taal (max. 12 woorden per stap)",
    "- Eerste stap moet heel makkelijk starten (onder 2 minuten)",
    "- Stappen in logische volgorde",
    "- Geen nummering in de tekst",
    `- Energieniveau: ${energy}`,
    duration ? `- Totale taakduur ongeveer ${duration} minuten` : "",
    `Taak: "${title}"`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function isAiGatewayConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim()
  );
}

export async function suggestMicroSteps(
  input: SuggestMicroStepsInput
): Promise<SuggestMicroStepsResult> {
  const locale = input.locale === "en" ? "en" : "nl";
  const title = input.title.trim();
  if (!title) {
    throw new Error("title_required");
  }

  if (!isAiGatewayConfigured()) {
    throw new Error("ai_not_configured");
  }

  const model = resolveMicroStepsModel();
  const { output, usage } = await generateText({
    model,
    output: Output.object({
      name: "MicroSteps",
      description: "Exactly four ADHD-friendly micro-steps for a task",
      schema: microStepsSchema,
    }),
    prompt: buildPrompt(input),
    temperature: 0.4,
  });

  const steps = output.steps.map((s) => s.trim()).filter(Boolean);
  if (steps.length !== 4) {
    throw new Error("invalid_ai_output");
  }

  return {
    steps,
    source: "ai",
    model,
    usage: {
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
    },
  };
}
