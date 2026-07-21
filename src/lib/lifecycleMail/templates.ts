import { getAppOrigin } from "@/lib/appUrl";
import { resolveStripeTrialDaysForSignupSource } from "@/lib/stripe/trialConfig";

import type {
  LifecycleCandidate,
  LifecycleRenderedMail,
  LifecycleTemplateId,
} from "./types";

function firstName(c: LifecycleCandidate): string {
  const raw = (c.preferred_name ?? "").trim();
  if (!raw) return "daar";
  return raw.split(/\s+/)[0] ?? "daar";
}

function wrapHtml(opts: {
  preview: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Structuro</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:Georgia,'Times New Roman',serif;color:#1F2A2A;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border-radius:12px;padding:32px 28px;border:1px solid #E5E0D8;">
          <tr>
            <td style="font-size:13px;letter-spacing:0.04em;color:#2D5A56;padding-bottom:12px;">STRUCTURO</td>
          </tr>
          <tr>
            <td style="font-size:17px;line-height:1.55;color:#1F2A2A;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;">
              <a href="${opts.ctaUrl}" style="display:inline-block;background:#2D5A56;color:#FFFFFF;text-decoration:none;font-family:system-ui,-apple-system,sans-serif;font-size:16px;font-weight:600;padding:14px 22px;border-radius:10px;">
                ${opts.ctaLabel}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:32px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.45;color:#6B7280;">
              Groet,<br />Niels<br /><br />
              <a href="${opts.unsubscribeUrl}" style="color:#6B7280;">Afmelden voor deze mails</a>
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
    .map((p) => `<p style="margin:0 0 14px 0;">${escapeHtml(p)}</p>`)
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
  const name = firstName(candidate);
  const hi = `Hoi ${name},`;
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
        paragraphs: [
          hi,
          "Gisteren hoefde niet. Vandaag mag één klein ding.",
        ],
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
