const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAAM = 120;
const MAX_EMAIL = 254;
const MAX_PRAKTIJK = 160;
const MAX_WEB = 200;
const MAX_TOEL = 2000;
const MAX_UTM = 60;

export type CoachAanvraagFields = {
  naam: string;
  praktijk: string;
  website: string;
  email: string;
  toelichting: string;
  utmContent: string;
};

export type ParseCoachAanvraagResult =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; fields: CoachAanvraagFields }
  | { ok: false; error: "validation" };

function clip(raw: unknown, max: number): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isChecked(raw: unknown): boolean {
  if (raw === true || raw === "true" || raw === "on" || raw === "1") return true;
  return false;
}

export function parseCoachAanvraag(raw: Record<string, unknown>): ParseCoachAanvraagResult {
  const honeypot = clip(raw.company ?? raw.honeypot, 200);
  if (honeypot.length > 0) {
    return { ok: true, honeypot: true };
  }

  if (!isChecked(raw.besloten)) {
    return { ok: false, error: "validation" };
  }

  const naam = clip(raw.naam ?? raw.name, MAX_NAAM);
  const email = clip(raw.email, MAX_EMAIL).toLowerCase();
  const praktijk = clip(raw.praktijk, MAX_PRAKTIJK);
  const website = clip(raw.website, MAX_WEB);
  const toelichting = String(raw.toelichting ?? "")
    .trim()
    .slice(0, MAX_TOEL);
  const utmContent = clip(raw.utmContent ?? raw.utm_content, MAX_UTM).replace(
    /[^\w-]/g,
    ""
  );

  if (!naam || !email || !EMAIL_REGEX.test(email)) {
    return { ok: false, error: "validation" };
  }

  return {
    ok: true,
    honeypot: false,
    fields: { naam, praktijk, website, email, toelichting, utmContent },
  };
}

export function coachAanvraagMail(fields: CoachAanvraagFields): {
  subject: string;
  text: string;
} {
  const subject =
    "Aanvraag coach" +
    (fields.utmContent ? ` (${fields.utmContent})` : "") +
    `: ${fields.naam}`;
  const lines = [
    "Nieuwe aanvraag via structuro.eu/voor-coaches/",
    "",
    `Naam: ${fields.naam}`,
    `Praktijk: ${fields.praktijk || "-"}`,
    `Website of Instagram: ${fields.website || "-"}`,
    `E-mail: ${fields.email}`,
  ];
  if (fields.utmContent) lines.push(`utm_content: ${fields.utmContent}`);
  lines.push(
    "",
    "Wat ik herken in de situatie tussen sessies:",
    fields.toelichting || "-"
  );
  return { subject, text: lines.join("\n") };
}

export function coachAanvraagToAddress(): string {
  const fromEnv = process.env.COACH_AANVRAAG_TO?.trim();
  return fromEnv || "info@structuro.eu";
}
