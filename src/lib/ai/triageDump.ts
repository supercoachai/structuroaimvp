import { generateText, Output } from "ai";
import { z } from "zod";

import { resolveMicroStepsModel } from "@/lib/ai/microStepsModel";
import {
  templateTriageDump,
  type TriageDumpItemInput,
} from "@/lib/ai/triageDumpTemplates";
import { isAiGatewayConfigured } from "@/lib/ai/suggestMicroSteps";

export type TriageDumpInput = {
  items: TriageDumpItemInput[];
  locale?: "nl" | "en";
};

export type TriageDumpResult = {
  results: { id: string; question: string }[];
  source: "template" | "ai";
  model?: string;
};

const triageResultSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        question: z
          .string()
          .min(8)
          .max(180)
          .describe(
            "Eén zachte vraag in het Nederlands, zonder schuld, prioriteit of moet/nice-to-have",
          ),
      }),
    )
    .min(1)
    .max(3),
});

function buildPrompt(items: TriageDumpItemInput[], locale: "nl" | "en"): string {
  const lines =
    locale === "en"
      ? [
          "For each brain-dump item, write one gentle question.",
          "The user may plan it, finish it, or let it go. Never assign priority.",
          "No shame, guilt, or urgency. Max 16 words per question.",
          ...items.map(
            (item, i) =>
              `${i + 1}. id=${item.id} text="${item.content.trim()}"${
                item.ageHint ? " (has been sitting a while)" : ""
              }`,
          ),
        ]
      : [
          "Schrijf per dumplijst-item één zachte vraag in het Nederlands.",
          "De gebruiker mag plannen, afmaken of laten gaan. Geen prioriteit toekennen.",
          "Geen schuld, schaamte of urgentie. Max. 16 woorden per vraag.",
          "Gebruik geen moet/nice-to-have of vergelijkbare labels.",
          ...items.map(
            (item, i) =>
              `${i + 1}. id=${item.id} tekst="${item.content.trim()}"${
                item.ageHint ? " (ligt al een tijdje)" : ""
              }`,
          ),
        ];
  return lines.join("\n");
}

export async function triageDump(input: TriageDumpInput): Promise<TriageDumpResult> {
  const items = input.items.slice(0, 3);
  if (items.length === 0) {
    throw new Error("items_required");
  }

  const locale = input.locale === "en" ? "en" : "nl";

  if (!isAiGatewayConfigured()) {
    return {
      results: templateTriageDump(items),
      source: "template",
    };
  }

  const model = resolveMicroStepsModel();
  const { output } = await generateText({
    model,
    output: Output.object({
      name: "DumpTriageQuestions",
      description: "Gentle triage questions for ADHD brain-dump items",
      schema: triageResultSchema,
    }),
    prompt: buildPrompt(items, locale),
    temperature: 0.35,
  });

  const byId = new Map(output.results.map((r) => [r.id, r.question.trim()]));
  const results = items.map((item) => ({
    id: item.id,
    question: byId.get(item.id) || templateTriageDump([item])[0]?.question || "",
  }));

  return {
    results: results.filter((r) => r.question.length > 0),
    source: "ai",
    model,
  };
}
