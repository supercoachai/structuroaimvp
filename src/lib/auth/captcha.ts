/** Publieke hCaptcha site key (zelfde provider als in Supabase Auth > Bot protection). */
export function getAuthCaptchaSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim();
  return key || null;
}

export function isAuthCaptchaEnabled(): boolean {
  return getAuthCaptchaSiteKey() !== null;
}

export function mapAuthCaptchaError(message: string, t: (key: string) => string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("captcha") ||
    lower.includes("turnstile") ||
    lower.includes("request disallowed")
  ) {
    return t("login.errCaptcha");
  }
  return message;
}
