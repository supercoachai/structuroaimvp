import { sendResendEmail } from "@/lib/email/resendClient";

/**
 * Transactionele kwitantie na geslaagde Stripe-afschrijving (geen marketing).
 */
export async function sendSubscriptionReceiptEmail(input: {
  to: string;
  amountLabel: string;
  periodEndLabel?: string | null;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const subject = `Je betaling van ${input.amountLabel}`;
  const periodLine = input.periodEndLabel
    ? `\nJe volgende periode loopt tot ${input.periodEndLabel}.`
    : "";
  const text = `Bedankt. We hebben ${input.amountLabel} ontvangen voor je Structuro-abonnement.${periodLine}

Opzeggen kan via de stopknop in je pre-charge mail, of mail info@structuro.eu.

Structuro`;

  const result = await sendResendEmail({
    to: input.to,
    subject,
    text,
    tags: [{ name: "transactional", value: "subscription_receipt" }],
  });
  if (!result.ok) return { ok: false };
  return { ok: true, skipped: result.skipped };
}
