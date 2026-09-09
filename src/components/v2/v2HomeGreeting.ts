import { firstNameFromDisplay } from "./v2PostAccountName";

const USER_NAME_KEY = "structuro_user_name";
const JOURNEY_KEY = "v2_journey";

/**
 * Eerste betekenisvolle voornaam uit kandidaten.
 * Slaat leeg, te kort en placeholders (Gebruiker, Jij, You, …) over.
 */
export function resolveV2GreetingFirstName(
  ...candidates: Array<string | null | undefined>
): string {
  for (const raw of candidates) {
    const first = firstNameFromDisplay(raw);
    if (first) return first;
  }
  return "";
}

/**
 * Home-headline: "Goedemiddag, Niels" als er een aanspreeknaam is,
 * anders alleen het groetwoord. Geen em-dash, geen placeholder-naam.
 */
export function formatV2HomeGreeting(
  greeting: string,
  name?: string | null,
): string {
  const word = greeting.trim();
  if (!word) return "";
  const first = firstNameFromDisplay(name);
  if (!first) return word;
  return `${word}, ${first}`;
}

/** Lokale bronnen: structuro_user_name, daarna v2_journey.name. */
export function peekLocalV2GreetingName(): string {
  if (typeof window === "undefined") return "";
  const candidates: string[] = [];
  try {
    candidates.push(window.localStorage.getItem(USER_NAME_KEY) ?? "");
  } catch {
    /* privémodus */
  }
  try {
    const raw = window.localStorage.getItem(JOURNEY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { name?: unknown };
      if (typeof parsed.name === "string") candidates.push(parsed.name);
    }
  } catch {
    /* corrupte journey negeren */
  }
  return resolveV2GreetingFirstName(...candidates);
}
