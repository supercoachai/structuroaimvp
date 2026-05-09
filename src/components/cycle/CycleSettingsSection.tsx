"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  clearAllCycleData,
  loadCycleProfile,
  saveCycleConsent,
  updateCycleAverageLength,
  updateCyclePeriodStart,
} from "@/lib/cycle/cycleProfileDb";
import {
  CYCLE_LENGTH_DEFAULT,
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  clampCycleLength,
  type CycleProfile,
} from "@/lib/cycle/types";
import CycleSetupForm from "./CycleSetupForm";

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CycleSettingsSection() {
  const { t, locale } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CycleProfile>({
    consentAt: null,
    lastPeriodStart: null,
    averageLength: CYCLE_LENGTH_DEFAULT,
  });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [enableOpen, setEnableOpen] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [lengthBusy, setLengthBusy] = useState(false);

  const consentOn = Boolean(profile.consentAt);

  const loadProfile = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await loadCycleProfile(id);
      setProfile(data);
    } catch (e) {
      console.warn("CycleSettingsSection load:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const id = data.user?.id ?? null;
        if (cancelled) return;
        setUserId(id);
        if (id) await loadProfile(id);
        else setLoading(false);
      } catch (e) {
        if (!cancelled) {
          console.warn("CycleSettingsSection user:", e);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  if (!userId && !loading) return null;

  const decreaseLength = async () => {
    if (!userId || lengthBusy) return;
    const next = clampCycleLength(profile.averageLength - 1);
    if (next === profile.averageLength) return;
    setLengthBusy(true);
    try {
      await updateCycleAverageLength(userId, next);
      setProfile((p) => ({ ...p, averageLength: next }));
      toast(t("cycle.settingsToastUpdated"));
    } catch (e) {
      toast(
        t("cycle.setupSaveError", {
          detail: e instanceof Error ? e.message : String(e),
        })
      );
    } finally {
      setLengthBusy(false);
    }
  };

  const increaseLength = async () => {
    if (!userId || lengthBusy) return;
    const next = clampCycleLength(profile.averageLength + 1);
    if (next === profile.averageLength) return;
    setLengthBusy(true);
    try {
      await updateCycleAverageLength(userId, next);
      setProfile((p) => ({ ...p, averageLength: next }));
      toast(t("cycle.settingsToastUpdated"));
    } catch (e) {
      toast(
        t("cycle.setupSaveError", {
          detail: e instanceof Error ? e.message : String(e),
        })
      );
    } finally {
      setLengthBusy(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!userId || removeBusy) return;
    setRemoveBusy(true);
    try {
      await clearAllCycleData(userId);
      setProfile({
        consentAt: null,
        lastPeriodStart: null,
        averageLength: CYCLE_LENGTH_DEFAULT,
      });
      setConfirmRemoveOpen(false);
      toast(t("cycle.settingsToastDisabled"));
    } catch (e) {
      toast(
        t("cycle.settingsRemoveError", {
          detail: e instanceof Error ? e.message : String(e),
        })
      );
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <Activity className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-base font-semibold text-slate-800">
          {t("cycle.settingsTitle")}
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-500 text-balance">
        {t("cycle.settingsHint")}
      </p>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <span className="text-sm font-medium text-slate-700">
          {consentOn
            ? t("cycle.settingsToggleOn")
            : t("cycle.settingsToggleOff")}
        </span>
        {consentOn ? (
          <button
            type="button"
            onClick={() => setConfirmRemoveOpen(true)}
            disabled={loading || removeBusy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("cycle.settingsDisable")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEnableOpen(true)}
            disabled={loading}
            className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("cycle.settingsEnable")}
          </button>
        )}
      </div>

      {consentOn ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("cycle.settingsPeriodLabel")}
            </span>
            <span className="text-sm text-slate-800">
              {formatDate(profile.lastPeriodStart, locale)}
            </span>
            <button
              type="button"
              onClick={() => setAdjustOpen(true)}
              className="mt-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.98]"
            >
              {t("cycle.settingsAdjustPeriod")}
            </button>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("cycle.settingsLengthLabel")}
            </span>
            <div className="mt-1 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => void decreaseLength()}
                disabled={profile.averageLength <= CYCLE_LENGTH_MIN || lengthBusy}
                aria-label={t("cycle.setupLengthDecreaseAria")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                –
              </button>
              <div className="flex flex-1 flex-col items-center">
                <span className="text-xl font-semibold tabular-nums text-slate-900">
                  {profile.averageLength}
                </span>
                <span className="text-xs text-slate-500">
                  {t("cycle.setupLengthDays")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void increaseLength()}
                disabled={profile.averageLength >= CYCLE_LENGTH_MAX || lengthBusy}
                aria-label={t("cycle.setupLengthIncreaseAria")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfirmRemoveOpen(true)}
            className="block text-sm font-medium text-red-600 transition-colors hover:text-red-700"
          >
            {t("cycle.settingsRemoveAll")}
          </button>
        </div>
      ) : null}

      {enableOpen ? (
        <CycleSetupModal
          title={t("cycle.settingsAdjustModalTitle")}
          initialPeriod={profile.lastPeriodStart}
          initialLength={profile.averageLength}
          onClose={() => setEnableOpen(false)}
          onSubmit={async (periodStart, length) => {
            if (!userId) return;
            await saveCycleConsent(userId, periodStart, length);
            await loadProfile(userId);
            setEnableOpen(false);
            toast(t("cycle.settingsToastEnabled"));
          }}
        />
      ) : null}

      {adjustOpen ? (
        <CycleSetupModal
          title={t("cycle.settingsAdjustModalTitle")}
          initialPeriod={profile.lastPeriodStart}
          initialLength={profile.averageLength}
          onClose={() => setAdjustOpen(false)}
          onSubmit={async (periodStart, length) => {
            if (!userId) return;
            await updateCyclePeriodStart(userId, periodStart);
            if (length !== profile.averageLength) {
              await updateCycleAverageLength(userId, length);
            }
            await loadProfile(userId);
            setAdjustOpen(false);
            toast(t("cycle.settingsToastUpdated"));
          }}
        />
      ) : null}

      {confirmRemoveOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("cycle.settingsRemoveConfirmTitle")}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/35 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !removeBusy) {
              setConfirmRemoveOpen(false);
            }
          }}
        >
          <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white text-left shadow-xl">
            <div className="px-6 pb-2 pt-5">
              <h3 className="text-base font-semibold text-slate-900">
                {t("cycle.settingsRemoveConfirmTitle")}
              </h3>
            </div>
            <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
              {t("cycle.settingsRemoveConfirmBody")}
            </p>
            <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => void handleConfirmRemove()}
                disabled={removeBusy}
                className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removeBusy
                  ? t("cycle.settingsRemoveBusy")
                  : t("cycle.settingsRemoveConfirmYes")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemoveOpen(false)}
                disabled={removeBusy}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("cycle.settingsRemoveConfirmCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CycleSetupModal({
  title,
  initialPeriod,
  initialLength,
  onClose,
  onSubmit,
}: {
  title: string;
  initialPeriod: string | null;
  initialLength: number;
  onClose: () => void;
  onSubmit: (periodStart: string, length: number) => Promise<void>;
}) {
  const { t } = useI18n();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/35 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col overflow-y-auto px-6 py-5">
          <CycleSetupForm
            initialLastPeriodStart={initialPeriod}
            initialAverageLength={initialLength}
            onSubmit={onSubmit}
            secondaryAction={{
              label: t("cycle.settingsRemoveConfirmCancel"),
              onClick: onClose,
            }}
          />
        </div>
      </div>
    </div>
  );
}
