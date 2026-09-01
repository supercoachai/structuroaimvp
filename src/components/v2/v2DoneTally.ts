"use client";

import { isV2TaskCompletedToday, loadV2Tasks, todayYmd } from "./v2Tasks";

export const V2_DONE_TALLY_KEY = "v2_done_tally";

export type V2DoneTally = {
  total: number;
  weekCount: number;
  /** Maandag van de lopende week (YYYY-MM-DD, lokale kalender). */
  weekStart: string;
  monthCount: number;
  /** Eerste dag van de lopende maand (YYYY-MM-DD). */
  monthStart: string;
  yearCount: number;
  /** Eerste dag van het lopende jaar (YYYY-MM-DD). */
  yearStart: string;
};

export type V2DoneTallyTick = {
  weekFrom: number;
  weekTo: number;
  totalFrom: number;
  totalTo: number;
};

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Lokale maandag van de week waarin `ymd` valt. */
export function mondayYmd(ymd: string): string {
  const date = parseYmd(ymd);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return todayYmd(date);
}

export function monthStartYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function yearStartYmd(ymd: string): string {
  return `${ymd.slice(0, 4)}-01-01`;
}

function clampCount(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function emptyV2DoneTally(today: string = todayYmd()): V2DoneTally {
  return {
    total: 0,
    weekCount: 0,
    weekStart: mondayYmd(today),
    monthCount: 0,
    monthStart: monthStartYmd(today),
    yearCount: 0,
    yearStart: yearStartYmd(today),
  };
}

function normalizeTally(raw: unknown, today: string): V2DoneTally | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const total = clampCount(Number(row.total));
  const weekCount = clampCount(Number(row.weekCount));
  const weekStart =
    typeof row.weekStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.weekStart)
      ? row.weekStart
      : mondayYmd(today);
  const hasMonth = typeof row.monthStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.monthStart);
  const hasYear = typeof row.yearStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.yearStart);
  return {
    total,
    weekCount,
    weekStart,
    monthCount: hasMonth ? clampCount(Number(row.monthCount)) : weekCount,
    monthStart: hasMonth ? row.monthStart as string : monthStartYmd(today),
    yearCount: hasYear ? clampCount(Number(row.yearCount)) : total,
    yearStart: hasYear ? row.yearStart as string : yearStartYmd(today),
  };
}

/** Nieuwe week/maand/jaar: alleen de betreffende teller op 0, rest blijft. */
export function rollTallyToWeek(
  tally: V2DoneTally,
  today: string = todayYmd(),
): V2DoneTally {
  const weekStart = mondayYmd(today);
  const monthStart = monthStartYmd(today);
  const yearStart = yearStartYmd(today);
  const next: V2DoneTally = {
    total: tally.total,
    weekCount: tally.weekStart === weekStart ? tally.weekCount : 0,
    weekStart,
    monthCount: tally.monthStart === monthStart ? tally.monthCount : 0,
    monthStart,
    yearCount: tally.yearStart === yearStart ? tally.yearCount : 0,
    yearStart,
  };
  if (
    next.weekCount === tally.weekCount &&
    next.weekStart === tally.weekStart &&
    next.monthCount === tally.monthCount &&
    next.monthStart === tally.monthStart &&
    next.yearCount === tally.yearCount &&
    next.yearStart === tally.yearStart
  ) {
    return tally;
  }
  return next;
}

function seedFromToday(today: string): V2DoneTally {
  try {
    const n = loadV2Tasks().filter((t) => isV2TaskCompletedToday(t, today)).length;
    return {
      total: n,
      weekCount: n,
      weekStart: mondayYmd(today),
      monthCount: n,
      monthStart: monthStartYmd(today),
      yearCount: n,
      yearStart: yearStartYmd(today),
    };
  } catch {
    return emptyV2DoneTally(today);
  }
}

function readStoredTally(today: string): V2DoneTally | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(V2_DONE_TALLY_KEY);
    if (!raw) return null;
    return normalizeTally(JSON.parse(raw), today);
  } catch {
    return null;
  }
}

function tallyChanged(a: V2DoneTally, b: V2DoneTally): boolean {
  return (
    a.weekStart !== b.weekStart ||
    a.weekCount !== b.weekCount ||
    a.monthStart !== b.monthStart ||
    a.monthCount !== b.monthCount ||
    a.yearStart !== b.yearStart ||
    a.yearCount !== b.yearCount ||
    a.total !== b.total
  );
}

/** Eerste keer: vul vanuit voltooide taken van vandaag, zodat bestaande wins niet op 0 starten. */
export function loadV2DoneTally(today: string = todayYmd()): V2DoneTally {
  if (typeof window === "undefined") return emptyV2DoneTally(today);
  const stored = readStoredTally(today);
  if (!stored) {
    const seeded = seedFromToday(today);
    saveV2DoneTally(seeded);
    return seeded;
  }
  const rolled = rollTallyToWeek(stored, today);
  if (tallyChanged(rolled, stored)) {
    saveV2DoneTally(rolled);
  }
  return rolled;
}

export function saveV2DoneTally(tally: V2DoneTally): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(V2_DONE_TALLY_KEY, JSON.stringify(tally));
  } catch {
    /* privémodus */
  }
}

/** +1 na afronden van een parent-taak. Seed niet (voorkomt dubbeltelling ná persist). */
export function recordV2Done(today: string = todayYmd()): V2DoneTallyTick {
  const stored = readStoredTally(today);
  const before = stored
    ? rollTallyToWeek(stored, today)
    : emptyV2DoneTally(today);
  const after: V2DoneTally = {
    total: before.total + 1,
    weekCount: before.weekCount + 1,
    weekStart: before.weekStart,
    monthCount: before.monthCount + 1,
    monthStart: before.monthStart,
    yearCount: before.yearCount + 1,
    yearStart: before.yearStart,
  };
  saveV2DoneTally(after);
  return {
    weekFrom: before.weekCount,
    weekTo: after.weekCount,
    totalFrom: before.total,
    totalTo: after.total,
  };
}

/** -1 als een taak van vandaag wordt teruggezet. */
export function unrecordV2Done(today: string = todayYmd()): V2DoneTally {
  const stored = readStoredTally(today);
  const before = stored
    ? rollTallyToWeek(stored, today)
    : emptyV2DoneTally(today);
  const after: V2DoneTally = {
    total: Math.max(0, before.total - 1),
    weekCount: Math.max(0, before.weekCount - 1),
    weekStart: before.weekStart,
    monthCount: Math.max(0, before.monthCount - 1),
    monthStart: before.monthStart,
    yearCount: Math.max(0, before.yearCount - 1),
    yearStart: before.yearStart,
  };
  saveV2DoneTally(after);
  return after;
}
