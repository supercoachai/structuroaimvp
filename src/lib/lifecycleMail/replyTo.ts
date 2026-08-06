/** Standaard Reply-To voor lifecycle-mail (moet replybaar zijn, nooit noreply). */
export const DEFAULT_LIFECYCLE_REPLY_TO = "info@structuro.eu";

export function resolveLifecycleReplyTo(): string {
  const fromEnv = process.env.LIFECYCLE_REPLY_TO?.trim();
  return fromEnv || DEFAULT_LIFECYCLE_REPLY_TO;
}
