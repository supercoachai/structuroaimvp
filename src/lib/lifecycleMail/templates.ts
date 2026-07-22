import { getAppOrigin } from "@/lib/appUrl";
import { resolveStripeTrialDaysForSignupSource } from "@/lib/stripe/trialConfig";

import type {
  LifecycleCandidate,
  LifecycleRenderedMail,
  LifecycleTemplateId,
} from "./types";

/** Placeholder-namen die we niet in de aanhef willen (onboarding-fallback e.d.). */
const PLACEHOLDER_FIRST_NAMES = new Set([
  "daar",
  "gebruiker",
  "user",
  "naam",
  "anoniem",
  "anonymous",
  "guest",
]);

/**
 * Echte voornaam, of null als die ontbreekt / een placeholder is.
 * Mail zegt dan "Hoi," i.p.v. "Hoi Gebruiker,".
 */
export function resolveGreetingName(c: LifecycleCandidate): string | null {
  const raw = (c.preferred_name ?? "").trim();
  if (!raw) return null;
  const first = (raw.split(/\s+/)[0] ?? "").trim();
  if (!first) return null;
  if (PLACEHOLDER_FIRST_NAMES.has(first.toLowerCase())) return null;
  return first;
}

export function greetingLine(c: LifecycleCandidate): string {
  const name = resolveGreetingName(c);
  return name ? `Hoi ${name},` : "Hoi,";
}

/** Brand tokens (Variant F): surface / ink / accent. Inline voor e-mailclients. */
const MAIL = {
  surface: "#FDFBF4",
  card: "#FFFFFF",
  ink: "#1A2340",
  accent: "#2D5A56",
  muted: "#5C6478",
  border: "#E8E4DA",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const;

function wrapHtml(opts: {
  preview: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  const preview = escapeHtml(opts.preview);
  const ctaLabel = escapeHtml(opts.ctaLabel);
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Structuro</title>
</head>
<body style="margin:0;padding:0;background:${MAIL.surface};font-family:${MAIL.font};color:${MAIL.ink};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MAIL.surface};padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${MAIL.card};border-radius:16px;border:1px solid ${MAIL.border};">
          <tr>
            <td style="padding:28px 24px 8px 24px;font-family:${MAIL.font};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${MAIL.accent};">
              Structuro
            </td>
          </tr>
          <tr>
            <td style="padding:4px 24px 0 24px;">
              <div style="height:2px;width:40px;background:${MAIL.accent};border-radius:2px;line-height:2px;font-size:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 0 24px;font-family:${MAIL.font};font-size:16px;line-height:1.6;color:${MAIL.ink};">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 0 24px;">
              <a href="${opts.ctaUrl}" style="display:block;width:100%;box-sizing:border-box;background:${MAIL.accent};color:#FFFFFF;text-decoration:none;font-family:${MAIL.font};font-size:16px;font-weight:600;line-height:1.25;padding:16px 20px;border-radius:12px;text-align:center;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 28px 24px;font-family:${MAIL.font};font-size:14px;line-height:1.5;color:${MAIL.muted};">
              Groet,<br />
              Niels
              <br /><br />
              <a href="${opts.unsubscribeUrl}" style="color:${MAIL.muted};text-decoration:underline;">Afmelden voor deze mails</a>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td style="padding:16px 8px 0 8px;font-family:${MAIL.font};font-size:12px;line-height:1.4;color:${MAIL.muted};text-align:center;">
              Structuro · rust in je dag
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildMail(opts: {
  templateId: LifecycleTemplateId;
  cohortKey: string;
  subject: string;
  preview: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaPath: string;
  unsubscribeUrl: string;
}): LifecycleRenderedMail {
  const origin = getAppOrigin();
  const ctaUrl = `${origin}${opts.ctaPath.startsWith("/") ? opts.ctaPath : `/${opts.ctaPath}`}`;
  const bodyText = opts.paragraphs.join("\n\n");
  const text = `${bodyText}\n\n${opts.ctaLabel}: ${ctaUrl}\n\nGroet,\nNiels\n\nAfmelden: ${opts.unsubscribeUrl}`;
  const bodyHtml = opts.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-family:${MAIL.font};font-size:16px;line-height:1.6;color:${MAIL.ink};">${escapeHtml(p)}</p>`
    )
    .join("");
  return {
    templateId: opts.templateId,
    cohortKey: opts.cohortKey,
    subject: opts.subject,
    text,
    html: wrapHtml({
      preview: opts.preview,
      bodyHtml,
      ctaLabel: opts.ctaLabel,
      ctaUrl,
      unsubscribeUrl: opts.unsubscribeUrl,
    }),
    ctaPath: opts.ctaPath,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Amsterdam calendar date YYYY-MM-DD for cohort keys. */
export function amsterdamYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function renderLifecycleMail(
  templateId: LifecycleTemplateId,
  candidate: LifecycleCandidate,
  unsubscribeUrl: string,
  now = new Date()
): LifecycleRenderedMail {
  const hi = greetingLine(candidate);
  const trialDays = resolveStripeTrialDaysForSignupSource(candidate.signup_source);
  const cohort = amsterdamYmd(now);
  const n = Math.max(0, candidate.checkin_count);

  switch (templateId) {
    case "s0_welcome":
      return buildMail({
        templateId,
        cohortKey: `signup:${candidate.user_id}`,
        subject: "Je account staat klaar",
        preview: "Eén stap: open de app en kies wat je vandaag wilt doen.",
        paragraphs: [
          hi,
          `Je account is aangemaakt. Je hebt ${trialDays} dagen om Structuro rustig te proberen.`,
          "Eén stap: open de app en kies wat je vandaag wilt doen.",
          "Geen creditcard nodig deze dagen.",
        ],
        ctaLabel: "Naar dagstart",
        ctaPath: "/dagstart",
        unsubscribeUrl,
      });

    case "s1_day2":
      return buildMail({
        templateId,
        cohortKey: `day2:${cohort}`,
        subject: "Gisteren was druk. Vandaag mag klein.",
        preview: "Gisteren hoefde niet. Vandaag mag één klein ding.",
        paragraphs: [hi, "Gisteren hoefde niet. Vandaag mag één klein ding."],
        ctaLabel: "Open Structuro",
        ctaPath: "/",
        unsubscribeUrl,
      });

    case "s2_still":
      return buildMail({
        templateId,
        cohortKey: `still:${candidate.user_id}`,
        subject: "Even stil. Geen achterstand.",
        preview: "Structuro houdt geen lijst bij van wat je miste.",
        paragraphs: [
          hi,
          "Structuro houdt geen lijst bij van wat je miste.",
          "Als je wilt, kies je vandaag opnieuw één ding.",
        ],
        ctaLabel: "Naar de app",
        ctaPath: "/",
        unsubscribeUrl,
      });

    case "s3_value":
      return buildMail({
        templateId,
        cohortKey: `value:${cohort}`,
        subject: `Je deed ${n} keer iets terwijl het druk was`,
        preview: "Morgen vraagt de app of je wilt doorgaan. Geen verrassingen.",
        paragraphs: [
          hi,
          `De afgelopen dagen startte je ${n} keer je dag in Structuro.`,
          `Dat zijn ${n} momenten dat iets uit je hoofd naar gedaan ging.`,
          "Morgen vraagt de app of je wilt doorgaan. Geen verrassingen: je ziet het bedrag vóór je betaalt.",
        ],
        ctaLabel: "Naar Structuro",
        ctaPath: "/",
        unsubscribeUrl,
      });

    case "s4_pre_paywall":
      return buildMail({
        templateId,
        cohortKey: `prepaywall:${cohort}`,
        subject: "Morgen kies je of je door wilt",
        preview: "Je proefperiode loopt morgen af. Geen automatische charge.",
        paragraphs: [
          hi,
          "Je proefperiode loopt morgen af. Daarna kun je kiezen: door met Structuro, of stoppen.",
          "Geen automatische charge zonder dat je zelf een betaalmethode kiest.",
        ],
        ctaLabel: "Bekijk opties",
        ctaPath: "/abonnement",
        unsubscribeUrl,
      });

    case "s5_paywall":
      return buildMail({
        templateId,
        cohortKey: `paywall:${candidate.user_id}`,
        subject: "Je proefperiode is klaar",
        preview: "Wil je doorgaan? €12,99 per maand, opzeggen wanneer je wilt.",
        paragraphs: [
          hi,
          "Wil je doorgaan? €12,99 per maand, opzeggen wanneer je wilt.",
        ],
        ctaLabel: "Doorgaan met Structuro",
        ctaPath: "/abonnement",
        unsubscribeUrl,
      });

    case "s6_winback":
      return buildMail({
        templateId,
        cohortKey: `winback:${candidate.user_id}`,
        subject: "Nog een keer kijken?",
        preview: "Je probeerde Structuro een paar dagen. Geen druk.",
        paragraphs: [
          hi,
          "Je probeerde Structuro een paar dagen. Geen druk.",
          "Als je wilt, staat je account nog klaar.",
        ],
        ctaLabel: "Naar Structuro",
        ctaPath: "/",
        unsubscribeUrl,
      });

    default: {
      const _exhaustive: never = templateId;
      throw new Error(`Onbekende template: ${_exhaustive}`);
    }
  }
}
