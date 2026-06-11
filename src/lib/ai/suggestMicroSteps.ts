import { generateText, Output } from "ai";
import { z } from "zod";
import {
  MICRO_STEPS_COMPLETION_LADDER_EN,
  MICRO_STEPS_COMPLETION_LADDER_NL,
  validateMicroStepsCompletion,
} from "@/lib/ai/microStepsCompletion";
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
  start: z
    .string()
    .min(2)
    .max(120)
    .describe("Stap 1: makkelijke start die het klusje écht op gang brengt"),
  progress: z
    .string()
    .min(2)
    .max(120)
    .describe("Stap 2: het grootste deel van het werk uitvoeren"),
  almostDone: z
    .string()
    .min(2)
    .max(120)
    .describe("Stap 3: alles wat nog openstaat afmaken"),
  verifyDone: z
    .string()
    .min(2)
    .max(120)
    .describe("Stap 4: controleren dat de taak volledig af is"),
});

function energyLabel(
  energy: SuggestMicroStepsInput["energyLevel"],
  locale: "nl" | "en"
): string {
  if (energy === "low") return locale === "en" ? "low energy" : "lage energie";
  if (energy === "high") return locale === "en" ? "high energy" : "hoge energie";
  return locale === "en" ? "medium energy" : "normale energie";
}

function buildPrompt(input: SuggestMicroStepsInput, retryReason?: string): string {
  const locale = input.locale === "en" ? "en" : "nl";
  const title = input.title.trim();
  const duration =
    typeof input.durationMin === "number" && input.durationMin > 0
      ? input.durationMin
      : null;
  const energy = energyLabel(input.energyLevel, locale);
  const ladder =
    locale === "en"
      ? MICRO_STEPS_COMPLETION_LADDER_EN
      : MICRO_STEPS_COMPLETION_LADDER_NL;

  const lines =
    locale === "en"
      ? [
          "Split this task into exactly 4 micro-steps for someone with ADHD.",
          "CRITICAL: all 4 steps together must fully complete the task from start to done.",
          "Use this fixed ladder:",
          ...ladder.map((line) => `- ${line}`),
          "Rules:",
          "- Each step is one clear action (max 14 words)",
          "- Step 1 must be easy to start (<2 min) but must begin the real work",
          "- Steps 2-3 must advance the entire job, not random side actions",
          "- Step 4 must finish remaining work AND verify completion",
          "- Never use arbitrary partial counts (e.g. 'delete 5 emails') unless the title explicitly limits scope",
          "- If someone finishes all 4 steps, the task title must be truly done",
          `- Energy level: ${energy}`,
          duration
            ? `- Total duration about ${duration} minutes; all 4 steps must fit this`
            : "",
          retryReason ? `Fix this issue from the previous attempt: ${retryReason}` : "",
          `Task: "${title}"`,
        ]
      : [
          "Splits deze taak in precies 4 microstappen voor iemand met ADHD.",
          "CRUCIAAL: alle 4 stappen samen moeten de taak volledig afronden, van start tot klaar.",
          "Gebruik deze vaste ladder:",
          ...ladder.map((line) => `- ${line}`),
          "Regels:",
          "- Elke stap is één duidelijke actie (max. 14 woorden)",
          "- Stap 1 moet makkelijk starten (<2 min), maar het echte werk op gang brengen",
          "- Stap 2-3 moeten het hele klusje verder brengen, geen losse bijacties",
          "- Stap 4 moet restant afmaken EN controleren dat het klaar is",
          "- Geen willekeurige deel-aantallen (bijv. 'verwijder 5 mails') tenzij de titel dat expliciet vraagt",
          "- Als iemand alle 4 stappen doet, moet de taaktitel echt af zijn",
          `- Energieniveau: ${energy}`,
          duration
            ? `- Totale duur ongeveer ${duration} minuten; alle 4 stappen moeten daarin passen`
            : "",
          retryReason
            ? `Los dit probleem op van de vorige poging: ${retryReason}`
            : "",
          `Taak: "${title}"`,
        ];

  return lines.filter(Boolean).join("\n");
}

function outputToSteps(output: z.infer<typeof microStepsSchema>): string[] {
  return [
    output.start.trim(),
    output.progress.trim(),
    output.almostDone.trim(),
    output.verifyDone.trim(),
  ];
}

export function isAiGatewayConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim()
  );
}

async function generateOnce(
  input: SuggestMicroStepsInput,
  retryReason?: string
): Promise<{ steps: string[]; usage?: SuggestMicroStepsResult["usage"] }> {
  const model = resolveMicroStepsModel();
  const { output, usage } = await generateText({
    model,
    output: Output.object({
      name: "MicroStepsCompletion",
      description:
        "Four micro-steps that together complete the full task from start to verified done",
      schema: microStepsSchema,
    }),
    prompt: buildPrompt(input, retryReason),
    temperature: retryReason ? 0.2 : 0.35,
  });

  const steps = outputToSteps(output).filter(Boolean);
  if (steps.length !== 4) {
    throw new Error("invalid_ai_output");
  }

  return {
    steps,
    usage: {
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
    },
  };
}

export async function suggestMicroSteps(
  input: SuggestMicroStepsInput
): Promise<SuggestMicroStepsResult> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("title_required");
  }

  if (!isAiGatewayConfigured()) {
    throw new Error("ai_not_configured");
  }

  const model = resolveMicroStepsModel();
  let first = await generateOnce(input);
  let validationError = validateMicroStepsCompletion(first.steps);

  if (validationError) {
    const retry = await generateOnce(input, validationError);
    const retryError = validateMicroStepsCompletion(retry.steps);
    if (!retryError) {
      first = retry;
      validationError = null;
    } else {
      throw new Error("invalid_micro_steps");
    }
  }

  return {
    steps: first.steps,
    source: "ai",
    model,
    usage: first.usage,
  };
}
