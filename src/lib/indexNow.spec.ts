import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from "./indexNow";

const LANDING = join(fileURLToPath(new URL("../..", import.meta.url)), "structuro-eu-landing");

describe("IndexNow-sleutel", () => {
  it("staat als UTF-8-bestand op de EU-site-root en matcht de app-constante", () => {
    const body = readFileSync(join(LANDING, `${INDEXNOW_KEY}.txt`), "utf8").trim();
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    expect(INDEXNOW_KEY_PATH).toBe(`/${INDEXNOW_KEY}.txt`);
    expect(body).toBe(INDEXNOW_KEY);
  });
});
