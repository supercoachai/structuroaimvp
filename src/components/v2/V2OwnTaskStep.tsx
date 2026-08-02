"use client";

import { useEffect, useId, useRef, useState } from "react";

import { fetchMicroStepSuggestions } from "@/lib/ai/fetchMicroStepSuggestions";
import { useI18n } from "@/lib/i18n";

import type { V2Energy } from "./V2Context";
import { v2Styles } from "./theme";
import {
  getOwnTaskExamples,
  v2EnergyToAiLevel,
  type OwnTaskExample,
} from "./v2OnboardingOwnTask";
import { V2SheetPortal } from "./v2SheetPortal";

export type V2OwnTaskConfirmPayload = {
  title: string;
  microStepTitles: string[];
  usedWelcome: boolean;
  usedAi: boolean;
};

/**
 * Onboarding eigen-taak (variant B):
 * voorbeeld kiezen → Verder; of zelf typen → + opent “Je begint hier”-sheet.
 */
export default function V2OwnTaskStep({
  energy,
  onConfirm,
}: {
  energy: V2Energy | null;
  onConfirm: (payload: V2OwnTaskConfirmPayload) => void;
  onAdjust?: () => void;
}) {
  const { t, locale } = useI18n();
  const examples = getOwnTaskExamples(locale);
  const sheetTitleId = useId();
  const inFlightRef = useRef(false);

  const [pickId, setPickId] = useState<OwnTaskExample["id"] | null>(null);
  const [own, setOwn] = useState("");
  /** Eigen taak vastgelegd via + (dan pas Verder / sheet-waarde). */
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [customSteps, setCustomSteps] = useState<string[]>([]);
  const [usedAi, setUsedAi] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const chosen = examples.find((e) => e.id === pickId) ?? null;
  const draft = own.trim();
  const hasCustom = customTitle != null && customTitle.length >= 2;
  const canContinue = chosen != null || hasCustom;
  const usedWelcome = chosen?.id === "cancel";

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const runSplit = async (title: string) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSuggestBusy(true);
    setSuggestError(null);
    try {
      const result = await fetchMicroStepSuggestions({
        title,
        energyLevel: v2EnergyToAiLevel(energy),
        locale: locale === "en" ? "en" : "nl",
      });
      setCustomSteps(result.steps);
      setUsedAi(result.source === "ai" || result.source === "template");
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "global_cap_reached") {
        setSuggestError(t("v2.ownTaskSplitGlobalCap"));
      } else if (code === "rate_limited") {
        setSuggestError(t("v2.ownTaskSplitRateLimited"));
      } else {
        setSuggestError(t("v2.focusMicroSuggestError"));
      }
    } finally {
      setSuggestBusy(false);
      inFlightRef.current = false;
    }
  };

  const openCustomSheet = () => {
    if (draft.length < 2) return;
    setPickId(null);
    setCustomTitle(draft);
    setCustomSteps([]);
    setUsedAi(false);
    setSuggestError(null);
    setSheetOpen(true);
    void runSplit(draft);
  };

  const confirmExample = () => {
    if (!chosen) return;
    onConfirm({
      title: chosen.title,
      microStepTitles: [...chosen.microSteps],
      usedWelcome,
      usedAi: false,
    });
  };

  const confirmCustom = (steps: string[]) => {
    if (!customTitle) return;
    onConfirm({
      title: customTitle,
      microStepTitles: steps,
      usedWelcome: false,
      usedAi,
    });
  };

  return (
    <div className="v2-own-task">
      <div className="v2-own-task__body">
        <h1 className="v2-own-task__title">
          {t("v2.ownTaskTitleBefore")}
          <b className="v2-own-task__title-em">{t("v2.ownTaskTitleEm")}</b>.
        </h1>
        <p className="v2-own-task__sub">{t("v2.ownTaskSub")}</p>

        <div
          className="v2-own-task__examples"
          role="radiogroup"
          aria-label={t("v2.ownTaskExamplesAria")}
        >
          {examples.map((example) => {
            const on = pickId === example.id;
            return (
              <button
                key={example.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`v2-own-task__card${on ? " v2-own-task__card--active" : ""}`}
                onClick={() => {
                  setPickId(on ? null : example.id);
                  setOwn("");
                  setCustomTitle(null);
                  setCustomSteps([]);
                  setSheetOpen(false);
                }}
              >
                <div className="v2-own-task__card-row">
                  <span className="v2-own-task__radio" aria-hidden>
                    {on ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12.5L10 17l9-9"
                          stroke="currentColor"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span className="v2-own-task__card-copy">
                    <span className="v2-own-task__card-title">{example.title}</span>
                    <span className="v2-own-task__card-hint">{example.hint}</span>
                  </span>
                </div>
                {on ? (
                  <div className="v2-own-task__steps">
                    {example.microSteps.map((step, i) => (
                      <div
                        key={step}
                        className="v2-own-task__step"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <span className="v2-own-task__step-n" aria-hidden>
                          {i + 1}
                        </span>
                        <span className="v2-own-task__step-t">{step}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="v2-own-task__or" aria-hidden>
          <span>{t("v2.ownTaskOrType")}</span>
        </div>

        <div
          className={`v2-own-task__custom${draft || hasCustom ? " v2-own-task__custom--filled" : ""}`}
        >
          <label htmlFor="v2-own-task-title" style={v2Styles.srOnly}>
            {t("v2.ownTaskPlaceholder")}
          </label>
          <input
            id="v2-own-task-title"
            type="text"
            className="v2-own-task__input"
            value={own}
            onChange={(e) => {
              setOwn(e.target.value);
              setPickId(null);
              if (customTitle && e.target.value.trim() !== customTitle) {
                setCustomTitle(null);
                setCustomSteps([]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                openCustomSheet();
              }
            }}
            placeholder={t("v2.ownTaskPlaceholder")}
            autoComplete="off"
            maxLength={120}
          />
          <button
            type="button"
            className={`v2-own-task__add${draft.length >= 2 ? " v2-own-task__add--on" : ""}`}
            aria-label={t("v2.ownTaskAddAria")}
            disabled={draft.length < 2 || suggestBusy}
            onClick={openCustomSheet}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {canContinue ? (
        <div className="v2-own-task__footer">
          <button
            type="button"
            className="v2-own-task__cta"
            onClick={() => {
              if (chosen) confirmExample();
              else if (hasCustom) {
                if (customSteps.length === 0 && !sheetOpen) {
                  setSheetOpen(true);
                  if (!suggestBusy) void runSplit(customTitle);
                  return;
                }
                confirmCustom(customSteps);
              }
            }}
          >
            {chosen || customSteps.length > 0
              ? t("v2.ownTaskConfirmSteps")
              : t("v2.ownTaskContinue")}
          </button>
        </div>
      ) : null}

      {sheetOpen ? (
        <V2SheetPortal>
          <div className="v2-info-sheet" role="presentation">
            <button
              type="button"
              className="v2-info-sheet__backdrop"
              aria-label={t("v2.ownTaskSheetCloseAria")}
              onClick={() => setSheetOpen(false)}
            />
            <div
              className="v2-info-sheet__panel v2-own-task-sheet v2-own-task-sheet--begin"
              role="dialog"
              aria-modal="true"
              aria-labelledby={sheetTitleId}
            >
              <p className="v2-own-task-begin__task">{customTitle}</p>
              <h2 id={sheetTitleId} className="v2-own-task-begin__title">
                {t("v2.ownTaskBeginBefore")}
                <em>{t("v2.ownTaskBeginEm")}</em>
                {t("v2.ownTaskBeginAfter")}
              </h2>

              {suggestBusy ? (
                <p className="v2-own-task-sheet__status" aria-live="polite">
                  {t("v2.focusMicroSuggestBusy")}
                </p>
              ) : null}

              {suggestError ? (
                <p className="v2-own-task-sheet__error" role="alert">
                  {suggestError}
                </p>
              ) : null}

              {customSteps.length > 0 ? (
                <>
                  <div className="v2-own-task-begin__hero">
                    <span className="v2-own-task-begin__hero-label">
                      {t("v2.ownTaskBeginStepLabel", { n: "1" })}
                    </span>
                    <p className="v2-own-task-begin__hero-text">
                      {customSteps[0]}
                    </p>
                  </div>
                  {customSteps.length > 1 ? (
                    <>
                      <p className="v2-own-task-begin__rest-label">
                        {t("v2.ownTaskBeginRestLabel")}
                      </p>
                      <ol className="v2-own-task-begin__rest">
                        {customSteps.slice(1).map((step, i) => (
                          <li key={step} className="v2-own-task-begin__rest-item">
                            <span
                              className="v2-own-task-begin__rest-n"
                              aria-hidden
                            >
                              {i + 2}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                </>
              ) : null}

              <div className="v2-own-task-sheet__actions">
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={suggestBusy}
                  onClick={() => {
                    if (customSteps.length === 0 && !suggestError) {
                      void runSplit(customTitle ?? draft);
                      return;
                    }
                    setSheetOpen(false);
                    confirmCustom(customSteps);
                  }}
                >
                  {suggestBusy
                    ? t("v2.focusMicroSuggestBusy")
                    : customSteps.length > 0
                      ? t("v2.ownTaskConfirmSteps")
                      : t("v2.ownTaskSplitCta")}
                </button>
                <button
                  type="button"
                  className="v2-own-task-begin__skip"
                  disabled={suggestBusy}
                  onClick={() => {
                    setSheetOpen(false);
                    confirmCustom([]);
                  }}
                >
                  {t("v2.ownTaskSheetSkip")}
                </button>
              </div>
            </div>
          </div>
        </V2SheetPortal>
      ) : null}
    </div>
  );
}
