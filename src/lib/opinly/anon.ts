export const OPINLY_ANON_METADATA_KEY = "opinly_anon_id";

export function opinlyAnonMetadata(
  anonId: string | undefined
): Record<string, string> {
  return anonId ? { [OPINLY_ANON_METADATA_KEY]: anonId } : {};
}

export function readOpinlyAnonFromStripeMetadata(
  metadata: Record<string, string> | null | undefined
): string | undefined {
  const id = metadata?.[OPINLY_ANON_METADATA_KEY]?.trim();
  return id || undefined;
}

export function stripeCentsToMajor(amount: number | null | undefined): number {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return amount / 100;
}
