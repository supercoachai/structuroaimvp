/** Minimaal interval tussen last_seen_at writes (middleware). */
export const LAST_SEEN_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export function shouldTouchLastSeen(
  lastSeenAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!lastSeenAt) return true;
  const last = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(last)) return true;
  return nowMs - last >= LAST_SEEN_TOUCH_INTERVAL_MS;
}

type ProfileTouchClient = {
  from: (table: string) => {
    update: (row: { last_seen_at: string }) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

/** Fire-and-forget vriendelijk: errors loggen, nooit throwen naar caller. */
export async function touchProfileLastSeenAt(
  client: unknown,
  userId: string
): Promise<void> {
  try {
    const db = client as ProfileTouchClient;
    const { error } = await db
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      console.warn("[last_seen] update failed", error.message);
    }
  } catch (err) {
    console.warn("[last_seen] update error", err);
  }
}
