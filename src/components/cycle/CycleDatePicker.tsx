"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import { useI18n } from "@/lib/i18n";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseLocalIsoDate(iso: string): Date | null {
  const parts = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]) - 1;
  const day = Number(parts[3]);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }
  return d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function clampMonth(view: Date, min: Date, max: Date): Date {
  const v = startOfMonth(view);
  const minM = startOfMonth(min);
  const maxM = startOfMonth(max);
  if (v < minM) return minM;
  if (v > maxM) return maxM;
  return v;
}

/** Maandag = 0 … zondag = 6 (EU-week). */
function mondayIndex(day: number): number {
  return (day + 6) % 7;
}

function buildMonthGrid(viewMonth: Date): (Date | null)[] {
  const first = startOfMonth(viewMonth);
  const startPad = mondayIndex(first.getDay());
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export type CycleDatePickerProps = {
  id?: string;
  value: string;
  min: string;
  max: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  /** Standaard dicht; open alleen via trigger. */
  defaultOpen?: boolean;
};

export default function CycleDatePicker({
  id,
  value,
  min,
  max,
  onChange,
  disabled = false,
  defaultOpen = false,
}: CycleDatePickerProps) {
  const { t, locale } = useI18n();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const panelId = `${fieldId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);

  const minDate = useMemo(() => parseLocalIsoDate(min) ?? new Date(), [min]);
  const maxDate = useMemo(() => parseLocalIsoDate(max) ?? new Date(), [max]);
  const selected = useMemo(() => parseLocalIsoDate(value), [value]);

  const [open, setOpen] = useState(defaultOpen);
  const [viewMonth, setViewMonth] = useState(() =>
    clampMonth(selected ?? maxDate, minDate, maxDate)
  );

  useEffect(() => {
    if (!selected) return;
    setViewMonth(clampMonth(selected, minDate, maxDate));
  }, [selected, minDate, maxDate]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const localeTag = locale === "en" ? "en-GB" : "nl-NL";
  const monthLabel = viewMonth.toLocaleDateString(localeTag, {
    month: "long",
    year: "numeric",
  });
  const displayValue = selected
    ? selected.toLocaleDateString(localeTag, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1); // maandag
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(localeTag, { weekday: "short" });
    });
  }, [localeTag]);

  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const canPrev = startOfMonth(viewMonth) > startOfMonth(minDate);
  const canNext = startOfMonth(viewMonth) < startOfMonth(maxDate);

  const selectDay = (d: Date) => {
    const ymd = isoDateLocal(d);
    if (ymd < min || ymd > max) return;
    onChange(ymd);
    setOpen(false);
  };

  const goToday = () => {
    const today = isoDateLocal(new Date());
    if (today < min || today > max) return;
    onChange(today);
    setViewMonth(clampMonth(new Date(), minDate, maxDate));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="v2-cycle-datepicker">
      <button
        type="button"
        id={fieldId}
        className="v2-cycle-datepicker__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="v2-cycle-datepicker__trigger-value">{displayValue}</span>
        <span className="v2-cycle-datepicker__trigger-chevron" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="v2-cycle-datepicker__panel"
          role="dialog"
          aria-label={t("cycle.setupPeriodLabel")}
        >
          <div className="v2-cycle-datepicker__nav">
            <button
              type="button"
              className="v2-cycle-datepicker__nav-btn"
              aria-label={t("cycle.setupPeriodPrevMonthAria")}
              disabled={!canPrev || disabled}
              onClick={() =>
                setViewMonth((m) => clampMonth(addMonths(m, -1), minDate, maxDate))
              }
            >
              <ChevronLeftIcon className="v2-cycle-datepicker__nav-icon" aria-hidden />
            </button>
            <p className="v2-cycle-datepicker__month">{monthLabel}</p>
            <button
              type="button"
              className="v2-cycle-datepicker__nav-btn"
              aria-label={t("cycle.setupPeriodNextMonthAria")}
              disabled={!canNext || disabled}
              onClick={() =>
                setViewMonth((m) => clampMonth(addMonths(m, 1), minDate, maxDate))
              }
            >
              <ChevronRightIcon className="v2-cycle-datepicker__nav-icon" aria-hidden />
            </button>
          </div>

          <div className="v2-cycle-datepicker__weekdays" aria-hidden>
            {weekdayLabels.map((label, i) => (
              <span key={i} className="v2-cycle-datepicker__weekday">
                {label}
              </span>
            ))}
          </div>

          <div className="v2-cycle-datepicker__grid" role="grid">
            {cells.map((cell, idx) => {
              if (!cell) {
                return (
                  <span
                    key={`empty-${idx}`}
                    className="v2-cycle-datepicker__cell is-empty"
                    aria-hidden
                  />
                );
              }
              const ymd = isoDateLocal(cell);
              const isSelected = ymd === value;
              const isToday = ymd === isoDateLocal(new Date());
              const outOfRange = ymd < min || ymd > max;
              return (
                <button
                  key={ymd}
                  type="button"
                  role="gridcell"
                  className={[
                    "v2-cycle-datepicker__cell",
                    isSelected ? "is-selected" : "",
                    isToday && !isSelected ? "is-today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={outOfRange || disabled}
                  aria-selected={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => selectDay(cell)}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          <div className="v2-cycle-datepicker__footer">
            <button
              type="button"
              className="v2-cycle-datepicker__today"
              disabled={disabled || isoDateLocal(new Date()) < min || isoDateLocal(new Date()) > max}
              onClick={goToday}
            >
              {t("cycle.setupPeriodToday")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
