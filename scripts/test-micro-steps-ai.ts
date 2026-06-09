import { matchMicroStepTemplate } from "../src/lib/ai/microStepTemplates";
import { isAiGatewayConfigured, suggestMicroSteps } from "../src/lib/ai/suggestMicroSteps";

async function main() {
  const tpl = matchMicroStepTemplate("Bed verschonen", "nl");
  if (!tpl || tpl.steps.length !== 4) {
    throw new Error("template failed");
  }
  console.log("template ok");

  const configured = isAiGatewayConfigured();
  console.log("gateway configured:", configured);

  if (!configured) {
    console.log("ai skipped: set AI_GATEWAY_API_KEY in .env.local");
    return;
  }

  const ai = await suggestMicroSteps({
    title: "Rapport deadline voorbereiden",
    energyLevel: "medium",
    durationMin: 30,
    locale: "nl",
  });

  if (ai.steps.length !== 4) {
    throw new Error(`expected 4 ai steps, got ${ai.steps.length}`);
  }

  console.log("ai ok:", ai.source);
  for (const step of ai.steps) {
    console.log("-", step);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
