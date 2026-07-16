"use client";

import { isV2EveningDumpFromYesterday, loadV2Dump, type V2DumpItem } from "./v2Dump";
import { patchV2Settings, readV2Settings } from "./v2Settings";

export type V2MorningEveningReminder = {
  itemId: string;
  content: string;
  line: string;
};

function truncateForLine(content: string, max = 48): string {
  const trimmed = content.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function pickYesterdayEveningDump(
  items: V2DumpItem[],
  now = new Date(),
): V2DumpItem | null {
  const candidates = items.filter((item) => isV2EveningDumpFromYesterday(item, now));
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** Ochtendregel na avonddump gisteren; null buiten ochtend of na dismiss. */
export function getV2MorningEveningReminder(
  now = new Date(),
): V2MorningEveningReminder | null {
  if (typeof window === "undefined") return null;
  const hour = now.getHours();
  if (hour >= 18) return null;

  const item = pickYesterdayEveningDump(loadV2Dump(), now);
  if (!item) return null;

  const settings = readV2Settings();
  if (settings.morningEveningDumpDismissedItemId === item.id) return null;

  const snippet = truncateForLine(item.content);
  return {
    itemId: item.id,
    content: item.content,
    line: `Gisteravond schreef je iets over "${snippet}". Geen haast, het staat nog klaar als je wilt.`,
  };
}

export function dismissV2MorningEveningReminder(itemId: string): void {
  patchV2Settings({ morningEveningDumpDismissedItemId: itemId });
}
