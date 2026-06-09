import assert from "node:assert/strict";
import test from "node:test";
import {
  hasArbitraryPartialCount,
  hasWeakFinishStep,
  validateMicroStepsCompletion,
} from "./microStepsCompletion";

test("validateMicroStepsCompletion accepts full completion ladder", () => {
  const steps = [
    "Inbox openen, sorteer op oudste eerst",
    "Verwijder spam en nieuwsbrieven",
    "Beantwoord, archiveer of verwijder elke resterende mail",
    "Controleer: inbox staat op nul",
  ];
  assert.equal(validateMicroStepsCompletion(steps), null);
});

test("validateMicroStepsCompletion rejects arbitrary partial counts", () => {
  const steps = [
    "Inbox openen",
    "Verwijder 5 mails",
    "Beantwoord 3 mails",
    "Klaar",
  ];
  assert.equal(hasArbitraryPartialCount(steps), true);
  assert.equal(validateMicroStepsCompletion(steps), "arbitrary_partial_count");
});

test("validateMicroStepsCompletion rejects weak finish step", () => {
  const steps = [
    "Begin met opruimen",
    "Ruim de tafel op",
    "Ruim de bank op",
    "Ga verder morgen",
  ];
  assert.equal(hasWeakFinishStep(steps), true);
  assert.equal(validateMicroStepsCompletion(steps), "weak_finish_step");
});
