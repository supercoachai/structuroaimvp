import { microStepId, type MicroStep } from "@/lib/microSteps";
import { createClient } from "@/lib/supabase/client";
import { addTaskToSupabase } from "@/lib/supabase/tasksDb";

export const CREATE_WELCOME_TASK_STORAGE_KEY = "create_welcome_task";

/** Stripe Checkout Session metadata (string values only). */
export const CHECKOUT_METADATA_WELCOME_TASK = "add_welcome_task";

export const WELCOME_TASK_TITLE = "Abonnement opzeggen";

/** Eerste dagstart: taak om afronden te ervaren (los van checkout-welkomstaak). */
export const FIRST_DAGSTART_WELCOME_TASK_TITLE = "Vink dit af — zo voelt afronden";

export function welcomeTaskEnabledFromCheckoutMetadata(
  metadata: Record<string, string> | null | undefined
): boolean {
  return metadata?.[CHECKOUT_METADATA_WELCOME_TASK] === "1";
}

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

export async function createOnboardingWelcomeTask(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "onboarding_welcome")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return false;
  }

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

  return true;
}

/** Injecteer welkomstaak bij lege takenpool (eerste dagstart / onboarding). */
export async function ensureFirstDagstartWelcomeTask(
  userId: string
): Promise<boolean> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "onboarding_welcome")
    .eq("title", FIRST_DAGSTART_WELCOME_TASK_TITLE)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return false;
  }

  await addTaskToSupabase(userId, {
    title: FIRST_DAGSTART_WELCOME_TASK_TITLE,
    done: false,
    started: false,
    priority: 1,
    dueAt: null,
    duration: 2,
    source: "onboarding_welcome",
    reminders: [],
    repeat: "none",
    impact: "🚀",
    energyLevel: "low",
    estimatedDuration: 2,
    microSteps: [],
    notToday: false,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("structuro_tasks_updated"));
  }

  return true;
}
