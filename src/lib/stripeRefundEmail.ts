/**
 * Optionele bevestigingsmail na self-service refund (Resend REST API, geen extra dependency).
 */
export async function sendRefundConfirmationEmail(
  to: string,
  locale: "nl" | "en"
): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Structuro <noreply@structuro.eu>";
  if (!key) {
    console.warn("[refund-email] RESEND_API_KEY ontbreekt; geen mail verstuurd.");
    return { ok: true, skipped: true };
  }

  const subject =
    locale === "nl" ? "Je terugbetaling is verwerkt" : "Your refund has been processed";
  const text =
    locale === "nl"
      ? "We hebben je terugbetaling in gang gezet. Het duurt meestal 5 tot 10 werkdagen voordat het bedrag op je rekening staat. Je Structuro-toegang is direct beëindigd.\n\nVragen? Mail info@structuro.eu"
      : "We have initiated your refund. It usually takes 5 to 10 business days to appear on your account. Your Structuro access has ended immediately.\n\nQuestions? Email info@structuro.eu";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[refund-email] Resend error", res.status, body);
    return { ok: false };
  }
  return { ok: true };
}
