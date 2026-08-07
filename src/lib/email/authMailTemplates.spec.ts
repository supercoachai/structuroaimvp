import { describe, expect, it } from "vitest";

import {
  AUTH_MAIL_BROWSER_TIP,
  renderLoginCodeMail,
  renderPasswordResetMail,
} from "./authMailTemplates";

describe("authMailTemplates", () => {
  it("rendert password reset in Structuro-stijl (NL)", () => {
    const mail = renderPasswordResetMail({
      resetUrl: "https://www.structuro.ai/auth/wachtwoord-instellen?code=x",
      preferredName: "Niels",
    });
    expect(mail.subject).toBe("Stel je wachtwoord opnieuw in");
    expect(mail.html).toContain("Structuro");
    expect(mail.html).toContain("Nieuw wachtwoord instellen");
    expect(mail.html).toContain("Hoi Niels,");
    expect(mail.html).toContain("#2D5A56");
    expect(mail.html).not.toContain("Reset Password");
    expect(mail.html).not.toContain("\u2014");
    expect(mail.text).toContain("Chrome of Safari");
    expect(mail.text).toContain(AUTH_MAIL_BROWSER_TIP);
  });

  it("rendert login code met OTP-blok", () => {
    const mail = renderLoginCodeMail({
      loginUrl: "https://www.structuro.ai/auth/callback?next=%2F",
      otpCode: "12345678",
      preferredName: "Sam",
    });
    expect(mail.subject).toBe("Je inlogcode voor Structuro");
    expect(mail.html).toContain("12345678");
    expect(mail.html).toContain("Inloggen bij Structuro");
    expect(mail.text).toContain("12345678");
    expect(mail.text).toContain("Chrome of Safari");
  });
});
