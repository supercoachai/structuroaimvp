import { getAppOrigin } from "@/lib/appUrl";
import { getJasperOffer, isJasperSignupSource } from "@/lib/jasper/jasperOffer";
import { isV2PublicEnabled } from "@/lib/v2/v2LabAccess";

import {
  isStripeCardTrialing,
  resolveLifecycleTrialDays,
} from "./trialLength";
import type {
  LifecycleCandidate,
  LifecycleRenderedMail,
  LifecycleTemplateId,
} from "./types";

function lifecycleCtaHome(): string {
  return isV2PublicEnabled() ? "/" : "/";
}

function lifecycleCtaDagstart(): string {
  return isV2PublicEnabled() ? "/dagstart" : "/?dagstart=open";
}

function lifecycleCtaPaywall(): string {
  return isV2PublicEnabled() ? "/abonnement" : "/abonnement";
}

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
 * Zonder naam: géén kale "Hoi," (voelt als template).
 */
export function resolveGreetingName(c: LifecycleCandidate): string | null {
  const raw = (c.preferred_name ?? "").trim();
  if (!raw) return null;
  const first = (raw.split(/\s+/)[0] ?? "").trim();
  if (!first) return null;
  if (PLACEHOLDER_FIRST_NAMES.has(first.toLowerCase())) return null;
  return first;
}

/** Alleen met echte voornaam. Zonder naam: null (regel weglaten). */
export function greetingLine(c: LifecycleCandidate): string | null {
  const name = resolveGreetingName(c);
  return name ? `Hoi ${name},` : null;
}

/** Subject met voornaam vooraan, anders de neutrale variant. */
export function personalizedSubject(name: string | null, subject: string): string {
  if (!name) return subject;
  const trimmed = subject.trim();
  if (!trimmed) return name;
  return `${name}, ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
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

const FOUNDER = {
  name: "Niels van den Hurk",
  title: "Founder Structuro",
  /** Compact mark (~9KB), zelfde asset als v2 chrome. */
  logoPath: "/v2/logo-mark.png",
} as const;

const MAIL_SERIF = "Georgia,'Times New Roman',Times,serif";

/** Teksthandtekening: geen foto (crop/object-fit is onbetrouwbaar in mailclients). */
function founderSignatureHtml(): string {
  const name = escapeHtml(FOUNDER.name);
  const title = escapeHtml(FOUNDER.title);
  return `
              <p style="margin:0 0 6px 0;font-family:${MAIL.font};font-size:14px;line-height:1.5;color:${MAIL.muted};">Groet,</p>
              <div style="font-family:${MAIL.font};font-size:15px;font-weight:600;line-height:1.3;color:${MAIL.ink};">${name}</div>
              <div style="font-family:${MAIL.font};font-size:13px;line-height:1.4;color:${MAIL.muted};padding-top:2px;">${title}</div>`;
}

function founderSignatureText(): string {
  return `Groet,\n${FOUNDER.name}\n${FOUNDER.title}`;
}

function brandHeaderHtml(logoUrl: string, homeUrl: string): string {
  const src = escapeHtml(logoUrl);
  const href = escapeHtml(homeUrl);
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="middle" style="padding:0 10px 0 0;vertical-align:middle;">
                    <a href="${href}" style="text-decoration:none;">
                      <img src="${src}" width="28" height="20" alt="" style="display:block;width:28px;height:20px;border:0;" />
                    </a>
                  </td>
                  <td valign="middle" style="padding:0;vertical-align:middle;">
                    <a href="${href}" style="font-family:${MAIL_SERIF};font-size:22px;font-weight:400;line-height:1;color:${MAIL.ink};text-decoration:none;">
                      Structuro
                    </a>
                  </td>
                </tr>
              </table>`;
}

function wrapHtml(opts: {
  preview: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaSubline?: string;
  unsubscribeUrl: string;
  logoUrl: string;
  homeUrl: string;
}): string {
  const preview = escapeHtml(opts.preview);
  const ctaLabel = escapeHtml(opts.ctaLabel);
  const ctaSublineHtml = opts.ctaSubline
    ? `<tr>
            <td style="padding:10px 24px 0 24px;font-family:${MAIL.font};font-size:13px;line-height:1.5;color:${MAIL.muted};text-align:center;">
              ${escapeHtml(opts.ctaSubline)}
            </td>
          </tr>`
    : "";
  // Vult de inbox-snippet zodat "Structuro" + body niet achter de preview plakt.
  const previewPad = "&zwnj;&nbsp;".repeat(80);
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Structuro</title>
</head>
<body style="margin:0;padding:0;background:${MAIL.surface};font-family:${MAIL.font};color:${MAIL.ink};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preview}${previewPad}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MAIL.surface};padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${MAIL.card};border-radius:16px;border:1px solid ${MAIL.border};">
          <tr>
            <td style="padding:28px 24px 0 24px;">
              ${brandHeaderHtml(opts.logoUrl, opts.homeUrl)}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 0 24px;font-family:${MAIL.font};font-size:16px;line-height:1.6;color:${MAIL.ink};">
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
          ${ctaSublineHtml}
          <tr>
            <td style="padding:28px 24px 12px 24px;font-family:${MAIL.font};">
              ${founderSignatureHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px 24px;font-family:${MAIL.font};font-size:14px;line-height:1.5;color:${MAIL.muted};">
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
  ctaSubline?: string;
  unsubscribeUrl: string;
}): LifecycleRenderedMail {
  const origin = getAppOrigin();
  const ctaUrl = `${origin}${opts.ctaPath.startsWith("/") ? opts.ctaPath : `/${opts.ctaPath}`}`;
  const logoUrl = `${origin}${FOUNDER.logoPath}`;
  const paragraphs = opts.paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const bodyText = paragraphs.join("\n\n");
  const sublineText = opts.ctaSubline ? `\n${opts.ctaSubline}` : "";
  const text = `${bodyText}\n\n${opts.ctaLabel}: ${ctaUrl}${sublineText}\n\n${founderSignatureText()}\n\nAfmelden: ${opts.unsubscribeUrl}`;
  const bodyHtml = paragraphs
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
      ctaSubline: opts.ctaSubline,
      unsubscribeUrl: opts.unsubscribeUrl,
      logoUrl,
      homeUrl: origin,
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

export type RenderLifecycleMailExtras = {
  cancelUrl?: string;
};

export function renderLifecycleMail(
  templateId: LifecycleTemplateId,
  candidate: LifecycleCandidate,
  unsubscribeUrl: string,
  now = new Date(),
  extras?: RenderLifecycleMailExtras
): LifecycleRenderedMail {
  const name = resolveGreetingName(candidate);
  const hi = greetingLine(candidate);
  const trialDays = resolveLifecycleTrialDays(candidate);
  const cardTrialing = isStripeCardTrialing(candidate);
  const cohort = amsterdamYmd(now);
  const n = Math.max(0, candidate.checkin_count);
  const paras = (...lines: Array<string | null>) =>
    lines.filter((line): line is string => Boolean(line && line.trim()));

  switch (templateId) {
    case "s0_hello": {
      const noCardLine =
        trialDays >= 7
          ? "Open de app en begin met één ding. Opzeggen doe je later in één tik, als je wilt."
          : "Open de app en begin met één ding. Geen creditcard nodig deze dagen.";
      return buildMail({
        templateId,
        cohortKey: `hello:${candidate.user_id}`,
        subject: personalizedSubject(name, "Welkom bij Structuro"),
        preview: "Welkom. Open de app en begin vandaag klein.",
        paragraphs: paras(
          hi,
          "Welkom bij Structuro.",
          `Je hebt ${trialDays} dagen om rustig te proberen. Geen planning voor de hele week, geen lijst die groeit. Alleen vandaag.`,
          noCardLine
        ),
        ctaLabel: "Naar dagstart",
        ctaPath: lifecycleCtaDagstart(),
        unsubscribeUrl,
      });
    }

    case "s0_welcome":
      return buildMail({
        templateId,
        cohortKey: `signup:${candidate.user_id}`,
        subject: personalizedSubject(name, "Je account staat klaar"),
        preview: "Nog niet begonnen? Eén stap is genoeg.",
        paragraphs: paras(
          hi,
          "Je account staat klaar. Als je nog niet bent begonnen: dat hoeft niet groot.",
          "Eén stap: open de app en kies wat je vandaag wilt doen."
        ),
        ctaLabel: "Begin vandaag",
        ctaPath: lifecycleCtaDagstart(),
        unsubscribeUrl,
      });

    case "s0_checkout_resume": {
      const progressLine =
        n >= 1
          ? "Je deed je eerste dagstart. Mooi begin. Je account staat klaar; de laatste stap is je 7-daagse proef starten."
          : "Je account staat klaar. De laatste stap is je 7-daagse proef starten.";
      return buildMail({
        templateId,
        cohortKey: `checkout-resume:${candidate.user_id}`,
        subject: personalizedSubject(name, "Zo werkt je 7-daagse proef"),
        preview: "7 dagen proberen. Daarna kies je zelf.",
        paragraphs: paras(
          hi,
          progressLine,
          "Je kaart start alleen de proef. Vandaag gebeurt er geen afschrijving.",
          "De proef duurt 7 dagen. Twee dagen van tevoren krijg je eerst een mail. Geen verrassingen.",
          "Opzeggen kan altijd in één tik, vanuit je account.",
          "Wat je al deed is bewaard en staat klaar."
        ),
        ctaLabel: "Start mijn 7-daagse proef",
        ctaPath: lifecycleCtaPaywall(),
        ctaSubline:
          "Werkte iets niet, of heb je een vraag? Reply. Een echt persoon (ik) leest deze mails.",
        unsubscribeUrl,
      });
    }

    case "s0_checkout_help":
      return buildMail({
        templateId,
        cohortKey: `checkout-help:${candidate.user_id}`,
        subject: personalizedSubject(name, "Geen haast. Je proef staat nog klaar."),
        preview: "Geen druk. Je proef wacht rustig.",
        paragraphs: paras(
          hi,
          "Geen enkele druk. Ik check alleen even of dit niet tussen wal en schip is beland. Dat overkomt ons allemaal.",
          "Vandaag gebeurt er geen afschrijving. Vóór iets van je rekening gaat, krijg je altijd eerst een mail.",
          "Als de prijs, de kaartstap of de timing je tegenhoudt: reply en vertel het me. Ik hoor het graag."
        ),
        ctaLabel: "Start mijn 7-daagse proef",
        ctaPath: lifecycleCtaPaywall(),
        ctaSubline: "Opzeggen kan later in één tik, wanneer je wilt.",
        unsubscribeUrl,
      });

    case "s1_day2":
      return buildMail({
        templateId,
        cohortKey: `day2:${cohort}`,
        subject: personalizedSubject(name, "Gisteren was druk. Vandaag mag klein."),
        preview: "Gisteren hoefde niet. Vandaag mag één klein ding.",
        paragraphs: paras(hi, "Gisteren hoefde niet. Vandaag mag één klein ding."),
        ctaLabel: "Open Structuro",
        ctaPath: lifecycleCtaHome(),
        unsubscribeUrl,
      });

    case "s2_still": {
      const progressLine =
        n === 1
          ? "Je deed één dagstart. Dat is een echt begin."
          : n > 1
            ? `Je deed ${n} dagstarts. Dat is een echt begin.`
            : "Je account staat nog klaar. Geen inhalen nodig.";
      return buildMail({
        templateId,
        cohortKey: `still:${candidate.user_id}`,
        subject: personalizedSubject(name, "Je Structuro staat er nog precies zo bij."),
        preview: "Weer oppakken is makkelijk. Eén klein ding is genoeg.",
        paragraphs: paras(
          hi,
          progressLine,
          "Wil je er vandaag nog eentje doen? Kost een paar minuten, en alles staat nog klaar.",
          "Als het druk was, is dat helemaal oké. Dit staat hier klaar voor wanneer je zover bent."
        ),
        ctaLabel: "Open Structuro",
        ctaPath: lifecycleCtaHome(),
        unsubscribeUrl,
      });
    }

    case "s3_value":
      return buildMail({
        templateId,
        cohortKey: `value:${cohort}`,
        subject: personalizedSubject(
          name,
          `Je deed ${n} keer iets terwijl het druk was`
        ),
        preview:
          trialDays >= 7
            ? "Over een paar dagen vraagt de app of je wilt doorgaan."
            : "Morgen vraagt de app of je wilt doorgaan. Geen verrassingen.",
        paragraphs: paras(
          hi,
          `De afgelopen dagen startte je ${n} keer je dag in Structuro.`,
          `Dat zijn ${n} momenten dat iets uit je hoofd naar gedaan ging.`,
          trialDays >= 7
            ? "Over een paar dagen vraagt de app of je wilt doorgaan. Geen verrassingen: je ziet het bedrag vóór je betaalt, en stoppen kan in één tik."
            : "Morgen vraagt de app of je wilt doorgaan. Geen verrassingen: je ziet het bedrag vóór je betaalt."
        ),
        ctaLabel: "Naar Structuro",
        ctaPath: lifecycleCtaHome(),
        unsubscribeUrl,
      });

    case "s4_pre_paywall": {
      const cancelUrl = extras?.cancelUrl?.trim() || null;
      let ctaPath = lifecycleCtaPaywall();
      if (cancelUrl) {
        try {
          const parsed = new URL(cancelUrl, getAppOrigin());
          ctaPath = `${parsed.pathname}${parsed.search}` || ctaPath;
        } catch {
          /* keep paywall fallback */
        }
      }
      const cardCharge = cardTrialing || Boolean(cancelUrl);
      const chargeAt = candidate.subscription_current_period_end
        ? new Date(candidate.subscription_current_period_end)
        : null;
      const chargeDateLabel =
        chargeAt && !Number.isNaN(chargeAt.getTime())
          ? new Intl.DateTimeFormat("nl-NL", {
              timeZone: "Europe/Amsterdam",
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(chargeAt)
          : null;
      return buildMail({
        templateId,
        cohortKey: `prepaywall:${cohort}`,
        subject: personalizedSubject(
          name,
          chargeDateLabel
            ? `Je proef eindigt op ${chargeDateLabel}. Dit gebeurt er dan.`
            : "Morgen kies je of je door wilt"
        ),
        preview: cardCharge
          ? "Opzeggen kan in één klik vóór de afschrijving. Geen verrassingen."
          : "Je proefperiode loopt bijna af.",
        paragraphs: paras(
          hi,
          cardCharge && chargeDateLabel
            ? `Je 7-daagse proef eindigt op ${chargeDateLabel}. Op die dag wordt je kaart belast voor €12,99 voor je eerste maand, en daarna €12,99 per maand.`
            : "Je proefperiode loopt bijna af.",
          n > 0
            ? `Deze week deed je ${n} dagstart${n === 1 ? "" : "s"}.`
            : null,
          cardCharge
            ? "Is Structuro niets voor jou? Dan kun je vóór die datum met één klik opzeggen en word je niet belast. Geen formulier, geen nagesprek."
            : "Daarna kun je kiezen: door met Structuro, of stoppen."
        ),
        ctaLabel: cardCharge ? "Stop abonnement" : "Kies of je doorgaat",
        ctaPath: cardCharge && !cancelUrl ? "/stop-abonnement" : ctaPath,
        ctaSubline: cardCharge
          ? "Eén klik. Je houdt toegang tot het einde van je proefperiode. Vragen? Reply."
          : "Geen automatische charge zonder dat je zelf een betaalmethode kiest.",
        unsubscribeUrl,
      });
    }

    case "s5_paywall": {
      const jasper = isJasperSignupSource(candidate.signup_source);
      const offer = jasper ? getJasperOffer() : null;
      return buildMail({
        templateId,
        cohortKey: `paywall:${candidate.user_id}`,
        subject: personalizedSubject(
          name,
          jasper
            ? "Je proef via de podcast is klaar"
            : "Je proefperiode is klaar"
        ),
        preview: jasper
          ? `Doorgaan voor ${offer!.discountedPrice} per maand, de eerste ${offer!.discountedMonths} maanden.`
          : "Wil je doorgaan? €12,99 per maand. 14 dagen niet-goed-geld-terug.",
        paragraphs: paras(
          hi,
          jasper
            ? "Je 7 dagen gratis via de podcast met Jasper zijn voorbij."
            : "Je proefperiode is voorbij.",
          "Structuro is er niet om je week te plannen. Het blijft je helpen om vandaag te beginnen, zonder dat je daar eerst over hoeft na te denken.",
          jasper
            ? `Je kunt doorgaan voor ${offer!.discountedPrice} per maand, de eerste ${offer!.discountedMonths} maanden. Daarna ${offer!.regularPrice} per maand.`
            : "€12,99 per maand."
        ),
        ctaLabel: jasper ? "Ga door met Structuro" : "Ja, ik ga door",
        ctaPath: lifecycleCtaPaywall(),
        ctaSubline:
          "Opzeggen wanneer je wilt. Niet tevreden binnen 14 dagen? Geld terug, geen vragen.",
        unsubscribeUrl,
      });
    }

    case "s6_winback":
      return buildMail({
        templateId,
        cohortKey: `winback:${candidate.user_id}`,
        subject: personalizedSubject(name, "Nog een keer kijken?"),
        preview: "Je account staat nog klaar. Geen inhalen nodig.",
        paragraphs: paras(
          hi,
          "Je account staat nog klaar. Geen inhalen nodig, geen lijst van wat je miste.",
          "Als je wilt, open je de app en kies je vandaag opnieuw één ding."
        ),
        ctaLabel: "Open Structuro",
        ctaPath: lifecycleCtaHome(),
        unsubscribeUrl,
      });

    case "s_winback_never_started":
      return buildMail({
        templateId,
        cohortKey: `winback-never:${candidate.user_id}`,
        subject: personalizedSubject(name, "Je maakte ooit een account"),
        preview: "Je account staat nog klaar. Eén ding is genoeg.",
        paragraphs: paras(
          hi,
          "Je maakte ooit een Structuro-account. Daarna bleef het stil.",
          "Dat is normaal. Beginnen is het zware deel, niet iets om je schuldig over te voelen.",
          "Als je wilt: open de app en kies vandaag één ding. Geen inhalen, geen lijst van wat je miste."
        ),
        ctaLabel: "Open Structuro",
        ctaPath: lifecycleCtaHome(),
        ctaSubline: "Geen interesse? Dan hoort je niets meer over dit account.",
        unsubscribeUrl,
      });

    case "s_winback_warm":
      return buildMail({
        templateId,
        cohortKey: `winback-warm:${candidate.user_id}`,
        subject: personalizedSubject(name, "Je begon met één dagstart"),
        preview: "Je deed één dagstart. Daarna stopte het. Dat is normaal.",
        paragraphs: paras(
          hi,
          "Je maakte een Structuro-account en deed één dagstart. Daarna stopte het.",
          "Dat is normaal. Beginnen is het zware deel, niet iets om je schuldig over te voelen.",
          "Als je wilt opnieuw proberen: open de app en kies vandaag opnieuw één ding."
        ),
        ctaLabel: "Open Structuro",
        ctaPath: lifecycleCtaHome(),
        ctaSubline: "Geen interesse? Dan hoort je niets meer over dit account.",
        unsubscribeUrl,
      });

    default: {
      const _exhaustive: never = templateId;
      throw new Error(`Onbekende template: ${_exhaustive}`);
    }
  }
}
