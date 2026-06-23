import { microStepId, type MicroStep } from "@/lib/microSteps";
import { createClient } from "@/lib/supabase/client";
import { addTaskToSupabase } from "@/lib/supabase/tasksDb";
import { addTaskToStorage, getTasksFromStorage } from "@/lib/localStorageTasks";

export const CREATE_WELCOME_TASK_STORAGE_KEY = "create_welcome_task";

/** Stripe Checkout Session metadata (string values only). */
export const CHECKOUT_METADATA_WELCOME_TASK = "add_welcome_task";

export const WELCOME_TASK_TITLE = "Abonnement opzeggen waar je al te lang voor betaalt";

/**
 * Sentinel-id voor de voorgestelde welkomstaak die nog niet is aangemaakt.
 * Tonen we als standaard suggestie in de eerste dagstart; de echte taak wordt
 * pas aangemaakt zodra de gebruiker ervoor kiest (zo blijft de verse-start
 * resetlogica intact omdat er geen taak op de achtergrond ontstaat).
 */
export const SUGGESTED_WELCOME_TASK_ID = "__suggested_welcome__";

/** Eerste dagstart: taak om afronden te ervaren (los van checkout-welkomstaak). */
export const FIRST_DAGSTART_WELCOME_TASK_TITLE = "Vink dit af — zo voelt afronden";

export function welcomeTaskEnabledFromCheckoutMetadata(
  metadata: Record<string, string> | null | undefined
): boolean {
  return metadata?.[CHECKOUT_METADATA_WELCOME_TASK] === "1";
}

export const WELCOME_MICRO_STEP_TITLES = [
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

/**
 * Maak de welkomstaak lokaal (anonieme onboarding) aan en geef de id terug.
 * Idempotent: bestaat er al een welkomstaak, dan hergebruiken we die.
 */
export function createLocalOnboardingWelcomeTask(energyLevel: string = "low"): string {
  const existing = getTasksFromStorage().find(
    (task) => task.source === "onboarding_welcome"
  );
  if (existing?.id) {
    return existing.id;
  }
  const task = addTaskToStorage({
    title: WELCOME_TASK_TITLE,
    done: false,
    started: false,
    priority: 1,
    dueAt: null,
    duration: null,
    source: "onboarding_welcome",
    completedAt: null,
    reminders: [],
    repeat: "none",
    impact: "🚀",
    energyLevel,
    estimatedDuration: null,
    microSteps: buildWelcomeMicroSteps(),
    notToday: false,
  });
  return task.id;
}

/**
 * Maak de welkomstaak in Supabase aan en geef de id terug (of de bestaande id).
 */
export async function createOnboardingWelcomeTaskReturningId(
  userId: string,
  energyLevel: string = "low"
): Promise<string | null> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "onboarding_welcome")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return String(existing.id);
  }

  const task = await addTaskToSupabase(userId, {
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
    energyLevel,
    estimatedDuration: null,
    microSteps: buildWelcomeMicroSteps(),
    notToday: false,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("structuro_tasks_updated"));
  }

  return task?.id ? String(task.id) : null;
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
