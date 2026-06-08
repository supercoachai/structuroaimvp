import {
  getCalendarDateAmsterdam,
  getTomorrowCalendarDateAmsterdam,
} from "@/lib/dagstartCookie";
import type { TaskRepeatSelection } from "@/components/tasks/TaskRepeatPicker";
import { formatHumanDateNl } from "@/lib/taskScheduleTime";

export type DeadlinePreset = "none" | "today" | "tomorrow" | "pick";

export type ParsedSchedulePhrase = {
  deadlinePreset?: DeadlinePreset;
  pickedYmd?: string;
  dueAtIso?: string | null;
  /** Expliciet wel/geen deadline (los van herhaling/planningstijd). */
  hasDeadline?: boolean;
  scheduleTime?: { hour: number; minute: number };
  repeatSelection?: TaskRepeatSelection;
  weeklyAnchorYmd?: string;
  /** Datum voor planning (zonder deadline), bijv. "29 mei om 20:30". */
  scheduleDateYmd?: string;
  duration?: number | null;
  energyLevel?: "low" | "medium" | "high";
  applied: string[];
  unrecognized: boolean;
};

const MONTHS_NL: Record<string, number> = {
  jan: 1,
  januari: 1,
  feb: 2,
  februari: 2,
  mrt: 3,
  maart: 3,
  mar: 3,
  apr: 4,
  april: 4,
  mei: 5,
  jun: 6,
  juni: 6,
  jul: 7,
  juli: 7,
  aug: 8,
  augustus: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oktober: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAY_PATTERN =
  "zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zo|ma|di|wo|do|vr|za";

const WEEKDAY_FULL_PATTERN =
  "zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag";

const WEEKDAYS_NL: Record<string, number> = {
  zondag: 0,
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
  zo: 0,
  ma: 1,
  di: 2,
  wo: 3,
  do: 4,
  vr: 5,
  za: 6,
};

type CanonicalDaypart = "ochtend" | "morgen" | "middag" | "avond" | "nacht";

const DAYPART_DEFAULTS: Record<
  CanonicalDaypart,
  { hour: number; minute: number; label: string }
> = {
  ochtend: { hour: 9, minute: 0, label: "ochtend" },
  morgen: { hour: 9, minute: 0, label: "morgen" },
  middag: { hour: 12, minute: 30, label: "middag" },
  avond: { hour: 19, minute: 0, label: "avond" },
  nacht: { hour: 21, minute: 0, label: "nacht" },
};

const CANONICAL_DAYPART_PATTERN = "ochtend|morgen|middag|avond|nacht";
const RAW_DAYPART_PATTERN =
  "ochtends?|ochtenden|morgens?|middags?|middagen|avonds?|avonden|nachts?|nachten";

function canonicalDaypart(token: string | undefined): CanonicalDaypart | null {
  if (!token) return null;
  const t = token.toLowerCase();
  if (t.startsWith("ochtend")) return "ochtend";
  if (t.startsWith("morgen")) return "morgen";
  if (t.startsWith("middag")) return "middag";
  if (t.startsWith("avond")) return "avond";
  if (t.startsWith("nacht")) return "nacht";
  return null;
}

function normalize(input: string): string {
  let text = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''`´]/g, "")
    .replace(/[-_/]/g, " ");

  text = text
    .replace(/\bsmorgens\b/g, "ochtend")
    .replace(/\bsmiddags\b/g, "middag")
    .replace(/\bsavonds\b/g, "avond")
    .replace(/\bsnachts\b/g, "nacht");

  text = text.replace(
    /\bs\s+(ochtends?|ochtenden|morgens?|middags?|middagen|avonds?|avonden|nachts?|nachten)\b/g,
    "$1"
  );

  text = text.replace(
    new RegExp(`\\b(${WEEKDAY_PATTERN})(${RAW_DAYPART_PATTERN})\\b`, "g"),
    "$1 $2"
  );

  text = text
    .replace(/\bochtenden\b/g, "ochtend")
    .replace(/\bochtends\b/g, "ochtend")
    .replace(/\bmiddagen\b/g, "middag")
    .replace(/\bmiddags\b/g, "middag")
    .replace(/\bavonden\b/g, "avond")
    .replace(/\bavonds\b/g, "avond")
    .replace(/\bnachten\b/g, "nacht")
    .replace(/\bnachts\b/g, "nacht")
    .replace(/\bmorgens\b/g, "morgen");

  text = text.replace(
    new RegExp(
      `\\b(${WEEKDAY_PATTERN})\\s*(${CANONICAL_DAYPART_PATTERN})\\b`,
      "g"
    ),
    "$1 $2"
  );

  return text.replace(/\s+/g, " ").trim();
}

const MONTH_NAME_PATTERN =
  "januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|jan|feb|mrt|mar|apr|jun|jul|aug|sep|sept|okt|nov|dec";

function ymdFromDayMonth(
  day: number,
  month: number,
  year = new Date().getFullYear()
): string | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  let y = year;
  const candidate = `${y}-${pad(month)}-${pad(day)}`;
  const today = getCalendarDateAmsterdam();
  if (candidate < today && month <= 6) y += 1;
  return `${y}-${pad(month)}-${pad(day)}`;
}

export function nearestWeekdayYmd(
  weekday: number,
  fromYmd = getCalendarDateAmsterdam()
): string {
  const [y, m, d] = fromYmd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const current = base.getUTCDay();
  let delta = weekday - current;
  if (delta < 0) delta += 7;
  if (delta === 0) return fromYmd;
  base.setUTCDate(base.getUTCDate() + delta);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
}

function dueAtWithTime(ymd: string, hour: number, minute: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ymd}T${pad(hour)}:${pad(minute)}:00.000+02:00`;
}

type WeekdayRecurrenceHit = {
  weekday: number;
  weekdayLabel: string;
  daypart: CanonicalDaypart | null;
  label: string;
};

function parseWeekdayRecurrence(text: string): WeekdayRecurrenceHit | null {
  const daypartGroup = `(?<daypart>${CANONICAL_DAYPART_PATTERN})?`;
  const patterns: RegExp[] = [
    new RegExp(
      `\\b(?:elke|iedere)\\s+(?<weekday>${WEEKDAY_PATTERN})(?:\\s+${daypartGroup})?\\b`,
      "i"
    ),
    new RegExp(
      `\\b(?:op|vanaf)\\s+(?:de\\s+)?(?<weekday>${WEEKDAY_PATTERN})(?:\\s+(?<daypart>${CANONICAL_DAYPART_PATTERN}))?\\b`,
      "i"
    ),
    new RegExp(
      `\\b(?<daypart>${CANONICAL_DAYPART_PATTERN})\\s+(?<weekday>${WEEKDAY_PATTERN})\\b`,
      "i"
    ),
    new RegExp(
      `\\b(?<weekday>${WEEKDAY_PATTERN})\\s+(?<daypart>${CANONICAL_DAYPART_PATTERN})\\b`,
      "i"
    ),
    new RegExp(`\\b(?<weekday>${WEEKDAY_FULL_PATTERN})\\b`, "i"),
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (!match?.groups?.weekday) continue;
    const weekdayLabel = match.groups.weekday.toLowerCase();
    const weekday = WEEKDAYS_NL[weekdayLabel];
    if (weekday === undefined) continue;
    const daypart = canonicalDaypart(match.groups.daypart);
    const label = daypart
      ? `${weekdayLabel} ${DAYPART_DEFAULTS[daypart].label}`
      : weekdayLabel;
    return { weekday, weekdayLabel, daypart, label };
  }
  return null;
}

function parseDailyDaypart(text: string): CanonicalDaypart | null {
  const match = text.match(
    new RegExp(
      `\\b(?:elke|iedere)\\s+(?<daypart>${CANONICAL_DAYPART_PATTERN})\\b`,
      "i"
    )
  );
  return canonicalDaypart(match?.groups?.daypart);
}

function isTomorrowDeadline(text: string): boolean {
  if (!/\bmorgen\b/.test(text)) return false;
  if (/\b(?:elke|iedere|op|vanaf)\s+morgen\b/.test(text)) return false;
  if (new RegExp(`\\b(?:${WEEKDAY_PATTERN})\\s+morgen\\b`).test(text)) {
    return false;
  }
  if (/\bvanaf\s+morgen\b/.test(text) && !/\bdeadline\b/.test(text)) {
    return false;
  }
  return true;
}

function findStandaloneDaypart(text: string): CanonicalDaypart | null {
  const match = text.match(
    new RegExp(`\\b(?<daypart>${CANONICAL_DAYPART_PATTERN})\\b`, "i")
  );
  const part = canonicalDaypart(match?.groups?.daypart);
  if (part === "morgen" && isTomorrowDeadline(text)) return null;
  return part;
}

type DeadlineIntent = { hasDeadline: boolean; label: string } | null;

function parseDeadlineIntent(text: string): DeadlineIntent {
  if (
    /\b(geen deadline|zonder deadline|niet deadline|geen datum|zonder datum|geen uiterste datum|niet inleveren)\b/.test(
      text
    )
  ) {
    return { hasDeadline: false, label: "geen deadline" };
  }

  if (
    /\b(deadline|uiterlijk|uiterste datum|af\s+voor|af\s+zijn|moet\s+af|ingeleverd|inleveren|af\s+zijn\s+voor)\b/.test(
      text
    ) ||
    /\b(ik\s+heb\s+(?:een\s+)?deadline|met\s+deadline|heb\s+deadline)\b/.test(
      text
    ) ||
    /\b(morgen|vandaag|overmorgen)\s+(?:is\s+)?(?:de\s+)?deadline\b/.test(text) ||
    /\bdeadline\s+(?:is\s+)?(?:morgen|vandaag|overmorgen)\b/.test(text)
  ) {
    return { hasDeadline: true, label: "wel deadline" };
  }

  return null;
}

function parseExplicitTime(
  text: string
): { hour: number; minute: number } | null {
  const om = text.match(
    /\bom\s*(\d{1,2})(?:[:\.](\d{2})|\s*u)?\s*(?:uur)?\b/
  );
  if (om) {
    return {
      hour: Math.min(23, parseInt(om[1], 10)),
      minute: om[2] ? parseInt(om[2], 10) : 0,
    };
  }
  const bare = text.match(/\b(\d{1,2})[:\.](\d{2})\b/);
  if (bare) {
    const hour = parseInt(bare[1], 10);
    const minute = parseInt(bare[2], 10);
    if (hour <= 23 && minute <= 59) return { hour, minute };
  }
  return null;
}

function applyWeeklyRecurrence(
  result: ParsedSchedulePhrase,
  hit: WeekdayRecurrenceHit
): void {
  result.repeatSelection = { repeat: "weekly", repeatWeekdays: "all" };
  result.weeklyAnchorYmd = nearestWeekdayYmd(hit.weekday);
  result.applied.push(`herhaling: wekelijks (${hit.label})`);
}

function scheduleLabelYmd(result: ParsedSchedulePhrase): string | null {
  return (
    result.scheduleDateYmd ??
    result.weeklyAnchorYmd ??
    (result.hasDeadline && result.pickedYmd ? result.pickedYmd : null) ??
    null
  );
}

function applyScheduleTime(
  result: ParsedSchedulePhrase,
  hour: number,
  minute: number,
  label?: string
): void {
  result.scheduleTime = { hour, minute };
  const anchorYmd = scheduleLabelYmd(result);
  if (anchorYmd) {
    result.applied.push(
      `planningstijd: ${formatHumanDateNl(anchorYmd, { hour, minute })}`
    );
    return;
  }
  const suffix = label ? ` (${label})` : "";
  result.applied.push(
    `planningstijd: om ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}${suffix}`
  );
}

function hasDateDeadlineContext(text: string): boolean {
  return (
    /\b(deadline|uiterlijk|uiterste datum|af\s+voor|af\s+zijn|ingeleverd|inleveren)\b/.test(
      text
    ) ||
    /\b(ik\s+heb\s+(?:een\s+)?deadline|met\s+deadline|heb\s+deadline)\b/.test(
      text
    ) ||
    /\b(morgen|vandaag|overmorgen)\s+(?:is\s+)?(?:de\s+)?deadline\b/.test(text) ||
    /\bdeadline\s+(?:is\s+)?(?:morgen|vandaag|overmorgen)\b/.test(text) ||
    /\bdeadline\s+op\b/.test(text)
  );
}

type ParsedNlDate = { ymd: string; day: number; monthToken: string };

function parseNlNamedDate(text: string): ParsedNlDate | null {
  const dayFirst = text.match(
    new RegExp(
      `\\b(\\d{1,2})\\s*(${MONTH_NAME_PATTERN})\\b(?:\\s*(\\d{4}))?`,
      "i"
    )
  );
  if (dayFirst) {
    const month = MONTHS_NL[dayFirst[2].toLowerCase()];
    const ymd = ymdFromDayMonth(
      parseInt(dayFirst[1], 10),
      month,
      dayFirst[3] ? parseInt(dayFirst[3], 10) : undefined
    );
    if (ymd) {
      return { ymd, day: parseInt(dayFirst[1], 10), monthToken: dayFirst[2] };
    }
  }

  const monthFirst = text.match(
    new RegExp(
      `\\b(${MONTH_NAME_PATTERN})\\s*(\\d{1,2})\\b(?:\\s*(\\d{4}))?`,
      "i"
    )
  );
  if (monthFirst) {
    const month = MONTHS_NL[monthFirst[1].toLowerCase()];
    const ymd = ymdFromDayMonth(
      parseInt(monthFirst[2], 10),
      month,
      monthFirst[3] ? parseInt(monthFirst[3], 10) : undefined
    );
    if (ymd) {
      return { ymd, day: parseInt(monthFirst[2], 10), monthToken: monthFirst[1] };
    }
  }

  return null;
}

function parseIsoLikeDate(text: string): string | null {
  const dashed = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;

  const spaced = text.match(/\b(\d{4})\s+(\d{1,2})\s+(\d{1,2})\b/);
  if (spaced) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${spaced[1]}-${pad(parseInt(spaced[2], 10))}-${pad(parseInt(spaced[3], 10))}`;
  }

  const dutchNumeric = text.match(
    /\b(\d{1,2})[-./](\d{1,2})(?:[-./](\d{4}))?\b/
  );
  if (dutchNumeric) {
    const day = parseInt(dutchNumeric[1], 10);
    const month = parseInt(dutchNumeric[2], 10);
    const ymd = ymdFromDayMonth(
      day,
      month,
      dutchNumeric[3] ? parseInt(dutchNumeric[3], 10) : undefined
    );
    return ymd;
  }

  return null;
}

function pushDeadlineLabel(result: ParsedSchedulePhrase, ymd: string): void {
  result.applied.push(`deadline: ${formatHumanDateNl(ymd)}`);
}

/** Rule-based NL parser voor optionele zin-invoer in taakbewerking. */
export function parseTaskSchedulePhrase(raw: string): ParsedSchedulePhrase {
  const text = normalize(raw);
  const result: ParsedSchedulePhrase = { applied: [], unrecognized: false };
  if (!text) return { ...result, unrecognized: true };

  let matched = false;
  let implicitDaypart: CanonicalDaypart | null = null;

  const deadlineIntent = parseDeadlineIntent(text);
  if (deadlineIntent) {
    result.hasDeadline = deadlineIntent.hasDeadline;
    result.applied.push(deadlineIntent.label);
    matched = true;
  }

  if (/\b(eenmalig|geen herhaling|niet herhalen)\b/.test(text)) {
    result.repeatSelection = { repeat: "none", repeatWeekdays: "all" };
    result.applied.push("herhaling: eenmalig");
    matched = true;
  } else if (/\b(werkdagen|maandag\s*t\/m\s*vrijdag|ma\s*-\s*vr)\b/.test(text)) {
    result.repeatSelection = { repeat: "daily", repeatWeekdays: "weekdays" };
    result.applied.push("herhaling: werkdagen");
    matched = true;
  } else if (/\b(dagelijks|elke dag|iedere dag)\b/.test(text)) {
    result.repeatSelection = { repeat: "daily", repeatWeekdays: "all" };
    result.applied.push("herhaling: dagelijks");
    matched = true;
  } else if (/\b(maandelijks|elke maand|iedere maand)\b/.test(text)) {
    result.applied.push("herhaling: maandelijks (nog niet in app)");
    matched = true;
  } else {
    const weekdayHit = parseWeekdayRecurrence(text);
    if (weekdayHit) {
      applyWeeklyRecurrence(result, weekdayHit);
      implicitDaypart = weekdayHit.daypart;
      matched = true;
    } else {
      const dailyDaypart = parseDailyDaypart(text);
      if (dailyDaypart) {
        result.repeatSelection = { repeat: "daily", repeatWeekdays: "all" };
        result.applied.push(
          `herhaling: dagelijks (${DAYPART_DEFAULTS[dailyDaypart].label})`
        );
        implicitDaypart = dailyDaypart;
        matched = true;
      } else if (/\b(wekelijks|elke week|iedere week)\b/.test(text)) {
        result.repeatSelection = { repeat: "weekly", repeatWeekdays: "all" };
        result.applied.push("herhaling: wekelijks");
        matched = true;
      }
    }
  }

  const wantsDeadline =
    result.hasDeadline !== false &&
    (result.hasDeadline === true || deadlineIntent?.hasDeadline === true);

  if (wantsDeadline || result.hasDeadline !== false) {
    if (/\bvandaag\b/.test(text) && (wantsDeadline || /\bdeadline\b/.test(text))) {
      result.deadlinePreset = "today";
      result.pickedYmd = getCalendarDateAmsterdam();
      result.hasDeadline = true;
      result.applied.push("deadline: vandaag");
      matched = true;
    } else if (isTomorrowDeadline(text)) {
      const hasDeadlineContext =
        wantsDeadline ||
        /\bdeadline\b/.test(text) ||
        /\b(morgen\s+heb\s+ik|heb\s+ik\s+morgen)\b/.test(text);
      if (hasDeadlineContext) {
        result.deadlinePreset = "tomorrow";
        result.pickedYmd = getTomorrowCalendarDateAmsterdam();
        result.hasDeadline = true;
        result.applied.push("deadline: morgen");
        matched = true;
      }
    } else if (/\bovermorgen\b/.test(text)) {
      result.deadlinePreset = "pick";
      const t = getCalendarDateAmsterdam();
      const [y, m, d] = t.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d + 2));
      const pad = (n: number) => String(n).padStart(2, "0");
      result.pickedYmd = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
      result.hasDeadline = true;
      result.applied.push("deadline: overmorgen");
      matched = true;
    } else {
      const afVoorWeekday = text.match(
        new RegExp(
          `\\baf\\s+(?:voor|zijn)\\s+(?<weekday>${WEEKDAY_FULL_PATTERN})\\b`,
          "i"
        )
      );
      if (afVoorWeekday?.groups?.weekday) {
        const wd = WEEKDAYS_NL[afVoorWeekday.groups.weekday.toLowerCase()];
        if (wd !== undefined) {
          result.deadlinePreset = "pick";
          result.pickedYmd = nearestWeekdayYmd(wd);
          result.hasDeadline = true;
          pushDeadlineLabel(result, result.pickedYmd);
          matched = true;
        }
      }

      const isoYmd = parseIsoLikeDate(text);
      const namedDate = parseNlNamedDate(text);
      const explicitDateYmd = isoYmd ?? namedDate?.ymd ?? null;
      const dateIsDeadline =
        explicitDateYmd &&
        (wantsDeadline || hasDateDeadlineContext(text) || /\bdeadline\b/.test(text));

      if (dateIsDeadline && explicitDateYmd) {
        result.deadlinePreset = "pick";
        result.pickedYmd = explicitDateYmd;
        result.hasDeadline = true;
        pushDeadlineLabel(result, explicitDateYmd);
        matched = true;
      } else if (explicitDateYmd && result.hasDeadline !== true) {
        result.scheduleDateYmd = explicitDateYmd;
        if (result.repeatSelection?.repeat === "weekly" && result.weeklyAnchorYmd) {
          const [y, m, d] = explicitDateYmd.split("-").map(Number);
          const explicitWeekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
          const [ay, am, ad] = result.weeklyAnchorYmd.split("-").map(Number);
          const anchorWeekday = new Date(Date.UTC(ay, am - 1, ad)).getUTCDay();
          if (explicitWeekday === anchorWeekday) {
            result.weeklyAnchorYmd = explicitDateYmd;
          }
        }
        matched = true;
      }
    }
  }

  const explicitTime = parseExplicitTime(text);
  if (explicitTime) {
    applyScheduleTime(
      result,
      explicitTime.hour,
      explicitTime.minute
    );
    if (result.hasDeadline === true && result.pickedYmd) {
      result.dueAtIso = dueAtWithTime(
        result.pickedYmd,
        explicitTime.hour,
        explicitTime.minute
      );
    }
    matched = true;
  } else if (!implicitDaypart) {
    implicitDaypart = findStandaloneDaypart(text);
  }

  if (!explicitTime && implicitDaypart) {
    const { hour, minute, label } = DAYPART_DEFAULTS[implicitDaypart];
    applyScheduleTime(result, hour, minute, label);
    matched = true;
  }

  if (result.hasDeadline === false) {
    result.deadlinePreset = "none";
    result.pickedYmd = undefined;
    result.dueAtIso = null;
  }

  if (
    result.repeatSelection &&
    result.repeatSelection.repeat !== "none" &&
    result.hasDeadline !== true &&
    !result.deadlinePreset
  ) {
    result.hasDeadline = false;
  }

  if (/\b(kwartier|15 min)\b/.test(text)) {
    result.duration = 15;
    result.applied.push("duur: 15 min");
    matched = true;
  } else if (/\bhalf\s*(?:uur|u)\b/.test(text)) {
    result.duration = 30;
    result.applied.push("duur: 30 min");
    matched = true;
  } else {
    const hourDur = !explicitTime && text.match(/\b(\d+)\s*(?:uur|u)\b/);
    if (hourDur) {
      result.duration = parseInt(hourDur[1], 10) * 60;
      result.applied.push(`duur: ${hourDur[1]} uur`);
      matched = true;
    } else {
      const minDur = text.match(/\b(\d+)\s*(?:min|minuten|m)\b/);
      if (minDur) {
        result.duration = parseInt(minDur[1], 10);
        result.applied.push(`duur: ${minDur[1]} min`);
        matched = true;
      }
    }
  }

  if (/\b(laag|rustig|makkelijk|licht)\b/.test(text)) {
    result.energyLevel = "low";
    result.applied.push("energie: laag");
    matched = true;
  } else if (/\b(hoog|intensief|zwaar|veel energie)\b/.test(text)) {
    result.energyLevel = "high";
    result.applied.push("energie: hoog");
    matched = true;
  } else if (/\b(normaal|gemiddeld|medium)\b/.test(text)) {
    result.energyLevel = "medium";
    result.applied.push("energie: normaal");
    matched = true;
  }

  result.unrecognized = !matched;
  return result;
}

/** 100+ NL-varianten voor regressie (dev/CI). */
export function runTaskScheduleParserSmokeTests(): {
  passed: number;
  failed: number;
  failures: string[];
} {
  const phrases = [
    "elke maandagochtend 11:00",
    "elke maandag ochtend om 11:00",
    "maandagochtend 11:00 geen deadline",
    "wekelijks maandag 11:00 zonder deadline",
    "iedere dinsdag 15 min om 10:00",
    "woensdagmiddag 30 min",
    "ik heb een deadline morgen",
    "morgen heb ik een deadline om 17:00",
    "deadline is morgen",
    "deadline morgen 15 min",
    "vandaag is de deadline",
    "af voor vrijdag",
    "uiterlijk 12 juni",
    "geen deadline elke maandag 11:00",
    "zonder deadline elke vrijdagochtend",
    "elke ochtend 20 min",
    "iedere avond om 19:00",
    "vanaf morgen elke dag 15 min",
    "vanaf morgen wekelijks maandag",
    "dagelijks vanaf morgen",
    "elke werkdag 30 min geen deadline",
    "smorgens op maandag 11:00",
    "ochtend maandag 11:00",
    "avond vrijdag om 20u",
    "elke maandagochtend 11:00 15 minuten laag",
    "maandelijks elke eerste maandag",
    "elke week woensdag 12:00",
    "eenmalig morgen deadline",
    "niet herhalen deadline vandaag",
    "normaal energie elke dinsdagochtend 11:00",
    "elke donderdagmiddag om 12:30 zonder datum",
    "op maandag 11:00",
    "vanaf dinsdag avond 45 min",
    "planning: elke zaterdagochtend om 9:00",
    "herhaalt wekelijks maandagochtend 11:00",
    "11:00 elke maandagochtend",
    "maandag 11:00 wekelijks",
    "deadline overmorgen 60 min",
    "ik heb deadline overmorgen hoog",
    "geen deadline dagelijks 15 min",
    "elke dag om 8:00",
    "elke morgen 15 min",
    "morgen 15 min",
    "vandaag 30 min hoog",
    "di ochtend 11:00",
    "vr avond 19:30",
    "zaterdag nacht 21:00",
    "s ochtends maandag",
    "maandag s ochtends 11:00",
    "iedere woensdagmiddag",
    "elke vrijdagavond laag",
    "woensdagmiddagen 15 min",
    "elke maandag 11:00 en geen deadline",
    "deadline 2026-12-01 wekelijks maandag",
    "wekelijks zonder deadline maandagochtend 11:00",
    "elke maandagochtend 11:00 deadline op 15 juni",
    "15 juni deadline elke week maandag",
    "rustig elke zondagavond",
    "intensief werkdagen 45 min",
    "half uur elke dinsdag 11:00",
    "kwartier maandagochtend",
    "elke dag deadline morgen",
    "morgen deadline 30 min",
    "zonder deadline elke ochtend om 7:00",
    "met deadline vandaag elke dag",
    "uiterste datum morgen eenmalig",
    "af zijn voor vrijdag 20 min",
    "ingeleverd uiterlijk maandag",
    "elke dinsdag 11:00 planning geen uiterste datum",
    "maandagochtend",
    "dinsdagmiddag 20 min hoog",
    "woensdagavond om 18:00",
    "donderdag nacht",
    "vrijdagochtend om 8:30",
    "zaterdagmiddag 25 min",
    "zondagavond 40 min",
    "elke maandagochtend",
    "elke dinsdagmiddag",
    "elke woensdagavond",
    "elke donderdagochtend om 10:00",
    "elke vrijdagmiddag 15 min",
    "elke zaterdagochtend 30 min",
    "elke zondagavond",
    "vanaf maandag wekelijks 11:00",
    "op dinsdag wekelijks 15 min",
    "elke week dinsdagochtend 11:00",
    "iedere week vrijdag 17:00",
    "dagelijks om 9:00",
    "werkdagen om 8:00 20 min",
    "geen herhaling deadline morgen",
    "eenmalig deadline vandaag 15 min",
    "elke maandagochtend 11:00 20 minuten",
    "elke maandagochtend om 11:00 uur",
    "maandagochtend 11:00 uur",
    "11:00 maandagochtend wekelijks",
    "wekelijks 11:00 maandagochtend",
    "planning elke maandag 11:00 zonder deadline",
    "geen deadline planning elke maandagochtend 11:00",
    "typo extra woorden: ik wil elke maandagochtend om 11:00 15 min",
    "begin met deadline morgen daarna elke dag 10 min",
    "vanaf morgen dagelijks deadline op vrijdag",
    "morgen start ik elke dag 15 min zonder deadline",
    "deadline vrijdag elke maandagochtend 11:00",
    "af voor 8 jun elke maandag",
    "8 juni deadline",
    "elke maandagochtend 11:00 laag rustig",
    "elke maandagochtend 11:00 hoog",
    "elke maandagochtend 11:00 normaal",
    "elke maandagochtend 11:00 gemiddeld",
    "elke maandagochtend 11:00 makkelijk",
    "elke maandagochtend 11:00 zwaar",
  ];

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const phrase of phrases) {
    const r = parseTaskSchedulePhrase(phrase);
    if (r.unrecognized) {
      failed += 1;
      failures.push(`geen match: "${phrase}"`);
      continue;
    }
    passed += 1;
  }

  const weeklyNoDl = parseTaskSchedulePhrase("elke maandagochtend 11:00");
  if (weeklyNoDl.hasDeadline !== false || weeklyNoDl.deadlinePreset) {
    failed += 1;
    passed -= 1;
    failures.push("elke maandagochtend 11:00 mag geen deadline hebben");
  }

  const withDl = parseTaskSchedulePhrase("morgen heb ik een deadline");
  if (!withDl.hasDeadline || withDl.deadlinePreset !== "tomorrow") {
    failed += 1;
    failures.push("morgen heb ik een deadline");
  }

  return { passed, failed, failures };
}
