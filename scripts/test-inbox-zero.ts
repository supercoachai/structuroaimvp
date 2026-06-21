import { matchMicroStepTemplate } from "../src/lib/ai/microStepTemplates";
import { suggestMicroSteps } from "../src/lib/ai/suggestMicroSteps";

async function main() {
  const title = "E-mail inbox op nul krijgen";
  const tpl = matchMicroStepTemplate(title, "nl");
  console.log("=== Template (gratis in app) ===");
  if (tpl) {
    tpl.steps.forEach((s, i) => console.log(`${i + 1}. ${s}`));
  } else {
    console.log("(geen template match)");
  }

  console.log("\n=== AI (nieuwe prompt) ===");
  const ai = await suggestMicroSteps({
    title,
    energyLevel: "low",
    durationMin: 20,
    locale: "nl",
  });
  ai.steps.forEach((s, i) => console.log(`${i + 1}. ${s}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
