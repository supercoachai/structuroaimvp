import { getAppOrigin } from "@/lib/appUrl";

/** Brand tokens (Variant F): surface / ink / accent. Inline voor e-mailclients. */
export const BRAND_MAIL = {
  surface: "#FDFBF4",
  card: "#FFFFFF",
  ink: "#1A2340",
  accent: "#2D5A56",
  muted: "#5C6478",
  border: "#E8E4DA",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const;

const BRAND_SERIF = "Georgia,'Times New Roman',Times,serif";

const FOUNDER = {
  name: "Niels van den Hurk",
  title: "Founder Structuro",
  logoPath: "/v2/logo-mark.png",
} as const;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
                    <a href="${href}" style="font-family:${BRAND_SERIF};font-size:22px;font-weight:400;line-height:1;color:${BRAND_MAIL.ink};text-decoration:none;">
                      Structuro
                    </a>
                  </td>
                </tr>
              </table>`;
}

function founderSignatureHtml(): string {
  const name = escapeHtml(FOUNDER.name);
  const title = escapeHtml(FOUNDER.title);
  return `
              <p style="margin:0 0 6px 0;font-family:${BRAND_MAIL.font};font-size:14px;line-height:1.5;color:${BRAND_MAIL.muted};">Groet,</p>
              <div style="font-family:${BRAND_MAIL.font};font-size:15px;font-weight:600;line-height:1.3;color:${BRAND_MAIL.ink};">${name}</div>
              <div style="font-family:${BRAND_MAIL.font};font-size:13px;line-height:1.4;color:${BRAND_MAIL.muted};padding-top:2px;">${title}</div>`;
}

export function founderSignatureText(): string {
  return `Groet,\n${FOUNDER.name}\n${FOUNDER.title}`;
}

export type BrandMailRendered = {
  subject: string;
  preview: string;
  text: string;
  html: string;
};

export function renderBrandMail(opts: {
  subject: string;
  preview: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  ctaSubline?: string;
  extraBodyHtml?: string;
  footerHtml?: string;
}): BrandMailRendered {
  const origin = getAppOrigin();
  const logoUrl = `${origin}${FOUNDER.logoPath}`;
  const paragraphs = opts.paragraphs.map((p) => p.trim()).filter(Boolean);
  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-family:${BRAND_MAIL.font};font-size:16px;line-height:1.6;color:${BRAND_MAIL.ink};">${escapeHtml(p)}</p>`
    )
    .join("");
  const sublineText = opts.ctaSubline ? `\n${opts.ctaSubline}` : "";
  const text = `${paragraphs.join("\n\n")}\n\n${opts.ctaLabel}: ${opts.ctaUrl}${sublineText}\n\n${founderSignatureText()}`;
  const ctaSublineHtml = opts.ctaSubline
    ? `<tr>
            <td style="padding:10px 24px 0 24px;font-family:${BRAND_MAIL.font};font-size:13px;line-height:1.5;color:${BRAND_MAIL.muted};text-align:center;">
              ${escapeHtml(opts.ctaSubline)}
            </td>
          </tr>`
    : "";
  const footerHtml =
    opts.footerHtml ??
    `<tr>
            <td style="padding:8px 24px 28px 24px;font-family:${BRAND_MAIL.font};font-size:12px;line-height:1.4;color:${BRAND_MAIL.muted};text-align:center;">
              Structuro · rust in je dag
            </td>
          </tr>`;
  const preview = escapeHtml(opts.preview);
  const previewPad = "&zwnj;&nbsp;".repeat(80);
  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Structuro</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_MAIL.surface};font-family:${BRAND_MAIL.font};color:${BRAND_MAIL.ink};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preview}${previewPad}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND_MAIL.surface};padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${BRAND_MAIL.card};border-radius:16px;border:1px solid ${BRAND_MAIL.border};">
          <tr>
            <td style="padding:28px 24px 0 24px;">
              ${brandHeaderHtml(logoUrl, origin)}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 0 24px;font-family:${BRAND_MAIL.font};font-size:16px;line-height:1.6;color:${BRAND_MAIL.ink};">
              ${bodyHtml}
              ${opts.extraBodyHtml ?? ""}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 0 24px;">
              <a href="${escapeHtml(opts.ctaUrl)}" style="display:block;width:100%;box-sizing:border-box;background:${BRAND_MAIL.accent};color:#FFFFFF;text-decoration:none;font-family:${BRAND_MAIL.font};font-size:16px;font-weight:600;line-height:1.25;padding:16px 20px;border-radius:12px;text-align:center;">
                ${escapeHtml(opts.ctaLabel)}
              </a>
            </td>
          </tr>
          ${ctaSublineHtml}
          <tr>
            <td style="padding:28px 24px 12px 24px;font-family:${BRAND_MAIL.font};">
              ${founderSignatureHtml()}
            </td>
          </tr>
          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: opts.subject,
    preview: opts.preview,
    text,
    html,
  };
}
