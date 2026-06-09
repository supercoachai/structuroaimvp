import assert from "node:assert/strict";
import test from "node:test";
import { matchMicroStepTemplate } from "./microStepTemplates";

test("matchMicroStepTemplate finds bed verschonen in Dutch", () => {
  const hit = matchMicroStepTemplate("Bed verschonen", "nl");
  assert.ok(hit);
  assert.equal(hit.steps.length, 4);
  assert.equal(hit.source, "template");
});

test("matchMicroStepTemplate returns null for unknown task", () => {
  assert.equal(matchMicroStepTemplate("Quantum fysica samenvatting", "nl"), null);
});

test("matchMicroStepTemplate uses inbox-zero template for op nul krijgen", () => {
  const hit = matchMicroStepTemplate("E-mail inbox op nul krijgen", "nl");
  assert.ok(hit);
  assert.match(hit.steps[3], /nul/i);
});
