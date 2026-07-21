/**
 * Minimale Resend REST-client (geen SDK). Gedeeld door refund- en lifecycle-mail.
 */

export type ResendSendInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type ResendSendResult =
  | { ok: true; id?: string; skipped?: boolean }
  | { ok: false; error: string; status?: number };

export function getResendFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Structuro <noreply@structuro.eu>"
  );
}

export async function sendResendEmail(
  input: ResendSendInput
): Promise<ResendSendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.warn("[resend] RESEND_API_KEY ontbreekt; geen mail verstuurd.");
    return { ok: true, skipped: true };
  }

  const from = getResendFromAddress();
  const body: Record<string, unknown> = {
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  };
  if (input.html) body.html = input.html;
  if (input.replyTo) body.reply_to = input.replyTo;
  if (input.tags?.length) body.tags = input.tags;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[resend] error", res.status, errBody);
    return { ok: false, error: errBody.slice(0, 500), status: res.status };
  }

  let id: string | undefined;
  try {
    const data = (await res.json()) as { id?: string };
    id = data.id;
  } catch {
    /* ignore */
  }
  return { ok: true, id };
}
