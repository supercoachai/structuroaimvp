import { suggestMicroSteps } from "../src/lib/ai/suggestMicroSteps";

const tasks = [
  { title: "Belastingaangifte doen", energyLevel: "medium" as const, durationMin: 60 },
  { title: "Kamer opruimen", energyLevel: "low" as const, durationMin: 25 },
  { title: "Presentatie voorbereiden voor werk", energyLevel: "high" as const, durationMin: 45 },
  { title: "Boodschappen doen voor de week", energyLevel: "medium" as const, durationMin: 40 },
  { title: "E-mail inbox op nul krijgen", energyLevel: "low" as const, durationMin: 20 },
];

async function main() {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(
      `--- Taak ${i + 1}: ${task.title} (${task.energyLevel}, ${task.durationMin} min) ---`
    );
    const result = await suggestMicroSteps({ ...task, locale: "nl" });
    const modelInfo = result.model ? ` (${result.model})` : "";
    console.log(`bron: ${result.source}${modelInfo}`);
    result.steps.forEach((step, j) => console.log(`${j + 1}. ${step}`));
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
