import { microStepId, type MicroStep } from "@/lib/microSteps";
import { addTaskToSupabase } from "@/lib/supabase/tasksDb";

export const CREATE_WELCOME_TASK_STORAGE_KEY = "create_welcome_task";

const WELCOME_TASK_TITLE = "Abonnement opzeggen";

const WELCOME_MICRO_STEP_TITLES = [
  "Bedenk welk abonnement je wilt opzeggen",
  "Zoek de opzegprocedure op (website, mail of telefoon)",
  "Voer de opzegging uit",
  "Wacht op bevestiging",
] as const;

export function setCreateWelcomeTaskFlag(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    sessionStorage.setItem(CREATE_WELCOME_TASK_STORAGE_KEY, "true");
  } else {
    sessionStorage.removeItem(CREATE_WELCOME_TASK_STORAGE_KEY);
  }
}

export function consumeCreateWelcomeTaskFlag(): boolean {
  if (typeof window === "undefined") return false;
  const value = sessionStorage.getItem(CREATE_WELCOME_TASK_STORAGE_KEY);
  sessionStorage.removeItem(CREATE_WELCOME_TASK_STORAGE_KEY);
  return value === "true";
}

function buildWelcomeMicroSteps(): MicroStep[] {
  return WELCOME_MICRO_STEP_TITLES.map((title) => ({
    id: microStepId(),
    title,
    minutes: null,
    difficulty: null,
    done: false,
  }));
}

export async function createOnboardingWelcomeTask(userId: string): Promise<void> {
  await addTaskToSupabase(userId, {
    title: WELCOME_TASK_TITLE,
    done: false,
    started: false,
    priority: 1,
    dueAt: null,
    duration: null,
    source: "onboarding_welcome",
    reminders: [],
    repeat: "none",
    impact: "🚀",
    energyLevel: "low",
    estimatedDuration: null,
    microSteps: buildWelcomeMicroSteps(),
    notToday: false,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("structuro_tasks_updated"));
  }
}
