export function onboardingDurationBucket(
  elapsedMs: number
): "<2m" | "2-5m" | "5m+" {
  const sec = elapsedMs / 1000;
  if (sec < 120) return "<2m";
  if (sec < 300) return "2-5m";
  return "5m+";
}

export function focusPlannedMinutesBucket(
  plannedMinutes: number
): "<5m" | "5-15m" | "15-30m" | "30m+" {
  if (plannedMinutes < 5) return "<5m";
  if (plannedMinutes < 15) return "5-15m";
  if (plannedMinutes < 30) return "15-30m";
  return "30m+";
}
