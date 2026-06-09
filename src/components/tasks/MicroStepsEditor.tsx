"use client";

import { useEffect, useState } from "react";
import { microStepId, type MicroStep } from "@/lib/microSteps";
import { useI18n } from "@/lib/i18n";

type MicroStepsEditorProps = {
  steps: MicroStep[];
  onChange: (steps: MicroStep[]) => void;
};

export default function MicroStepsEditor({
  steps: initialSteps,
  onChange,
}: MicroStepsEditorProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<MicroStep[]>(initialSteps);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    setDraft(initialSteps);
  }, [initialSteps]);

  const commit = (next: MicroStep[]) => {
    setDraft(next);
    onChange(next);
  };

  const toggleDone = (stepId: string) => {
    commit(
      draft.map((step) =>
        step.id === stepId ? { ...step, done: !step.done } : step
      )
    );
  };

  const updateTitle = (stepId: string, title: string) => {
    setDraft((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, title } : step))
    );
  };

  const saveTitle = (stepId: string) => {
    const trimmed = draft.find((s) => s.id === stepId)?.title.trim() ?? "";
    if (!trimmed) {
      commit(draft.filter((s) => s.id !== stepId));
      return;
    }
    commit(
      draft.map((step) =>
        step.id === stepId ? { ...step, title: trimmed } : step
      )
    );
  };

  const removeStep = (stepId: string) => {
    commit(draft.filter((step) => step.id !== stepId));
  };

  const addStep = () => {
    const title = newTitle.trim();
    if (!title) return;
    commit([
      ...draft,
      {
        id: microStepId(),
        title,
        minutes: null,
        difficulty: null,
        done: false,
      },
    ]);
    setNewTitle("");
  };

  return (
    <>
      {draft.map((step, idx) => (
        <div
          key={step.id}
          className={`lc-micro-step${step.done ? " done" : ""}`}
        >
          <button
            type="button"
            className={`lc-micro-check${step.done ? " done" : ""}`}
            onClick={() => toggleDone(step.id)}
            aria-pressed={step.done}
            aria-label={
              step.done ? t("tasks.stepUndoAria") : t("tasks.stepCheckAria")
            }
          >
            {step.done ? (
              <svg width={10} height={10} viewBox="0 0 12 12" aria-hidden>
                <path
                  d="M2 6l3 3 5-6"
                  stroke="#fff"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </button>
          <span className="lc-micro-num">{idx + 1}</span>
          <input
            type="text"
            value={step.title}
            onChange={(e) => updateTitle(step.id, e.target.value)}
            onBlur={() => saveTitle(step.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveTitle(step.id);
              }
            }}
            className="lc-micro-text lc-micro-text-input"
          />
          <button
            type="button"
            className="lc-micro-remove"
            onClick={() => removeStep(step.id)}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
      ))}

      <div className="lc-micro-add">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addStep();
            }
          }}
          placeholder={t("tasks.newMicroPh")}
          className="lc-micro-text lc-micro-text-input lc-micro-text-input--new"
        />
        <button type="button" className="lc-micro-add-btn" onClick={addStep}>
          {t("newTask.microAddStep")}
        </button>
      </div>
    </>
  );
}
