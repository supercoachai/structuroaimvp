import { sendResendEmail } from "@/lib/email/resendClient";

/**
 * Optionele bevestigingsmail na self-service refund (Resend REST API).
 */
export async function sendRefundConfirmationEmail(
  to: string,
  locale: "nl" | "en"
): Promise<{ ok: boolean; skipped?: boolean }> {
  const subject =
    locale === "nl" ? "Je terugbetaling is verwerkt" : "Your refund has been processed";
  const text =
    locale === "nl"
      ? "We hebben je terugbetaling in gang gezet. Het duurt meestal 5 tot 10 werkdagen voordat het bedrag op je rekening staat. Je Structuro-toegang is direct beëindigd.\n\nVragen? Mail info@structuro.eu"
      : "We have initiated your refund. It usually takes 5 to 10 business days to appear on your account. Your Structuro access has ended immediately.\n\nQuestions? Email info@structuro.eu";

  const result = await sendResendEmail({ to, subject, text });
  if (!result.ok) return { ok: false };
  return { ok: true, skipped: result.skipped };
}
