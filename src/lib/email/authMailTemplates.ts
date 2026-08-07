import { BRAND_MAIL, escapeHtml, renderBrandMail } from "@/lib/email/brandMail";

const PLACEHOLDER_FIRST_NAMES = new Set([
  "daar",
  "gebruiker",
  "user",
  "naam",
  "anoniem",
  "anonymous",
  "guest",
]);

export function resolveAuthGreetingName(
  preferredName: string | null | undefined
): string | null {
  const raw = (preferredName ?? "").trim();
  if (!raw) return null;
  const first = (raw.split(/\s+/)[0] ?? "").trim();
  if (!first) return null;
  if (PLACEHOLDER_FIRST_NAMES.has(first.toLowerCase())) return null;
  return first;
}

function greetingParagraph(name: string | null): string {
  return name ? `Hoi ${name},` : "Hoi,";
}

/** Zelfde boodschap als op auth-foutpagina's: geen in-app mailbrowser. */
export const AUTH_MAIL_BROWSER_TIP =
  "Tip: open de link of code in dezelfde browser waarin je inlogde (bijv. Chrome of Safari). Kopieer hem bij voorkeur niet via de in-app browser van Outlook of Gmail.";

export function renderPasswordResetMail(opts: {
  resetUrl: string;
  preferredName?: string | null;
}) {
  const name = resolveAuthGreetingName(opts.preferredName);
  return renderBrandMail({
    subject: "Stel je wachtwoord opnieuw in",
    preview: "Klik om een nieuw wachtwoord te kiezen voor Structuro.",
    paragraphs: [
      greetingParagraph(name),
      "Je vroeg om je wachtwoord te resetten. Met de knop hieronder kies je een nieuw wachtwoord.",
      AUTH_MAIL_BROWSER_TIP,
      "Werk je dit niet zelf bij? Dan kun je deze mail negeren.",
    ],
    ctaLabel: "Nieuw wachtwoord instellen",
    ctaUrl: opts.resetUrl,
    ctaSubline: "Link werkt eenmalig, in dezelfde browser, en verloopt na een tijd.",
  });
}

export function renderLoginCodeMail(opts: {
  loginUrl: string;
  otpCode: string;
  preferredName?: string | null;
}) {
  const code = opts.otpCode.replace(/\s+/g, "").trim();
  const otpHtml = `
              <p style="margin:0 0 8px 0;font-family:${BRAND_MAIL.font};font-size:14px;line-height:1.5;color:${BRAND_MAIL.muted};">Je inlogcode:</p>
              <p style="margin:0 0 20px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:0.2em;line-height:1.2;color:${BRAND_MAIL.ink};">${escapeHtml(code)}</p>`;
  const name = resolveAuthGreetingName(opts.preferredName);
  const mail = renderBrandMail({
    subject: "Je inlogcode voor Structuro",
    preview: "Gebruik je code of de knop om in te loggen.",
    paragraphs: [
      greetingParagraph(name),
      "Gebruik de code hieronder om in te loggen. Of klik op de knop als je liever direct doorgaat.",
      AUTH_MAIL_BROWSER_TIP,
      "Heb je dit niet aangevraagd? Negeer deze mail.",
    ],
    ctaLabel: "Inloggen bij Structuro",
    ctaUrl: opts.loginUrl,
    ctaSubline: "Code of link werkt in dezelfde browser en verloopt na een tijd.",
    extraBodyHtml: otpHtml,
  });
  return {
    ...mail,
    text: `${mail.text}\n\nJe inlogcode: ${code}`,
  };
}
