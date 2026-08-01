import { describe, expect, it } from "vitest";

import { resolveAnonDistinctIdForAlias } from "./serverAlias";

const ANON = "019fbd91-7815-7c1a-a6f2-7ca895767c23";
const USER = "4a20d9d2-13b0-45a3-a218-9530973899b8";

describe("resolveAnonDistinctIdForAlias", () => {
  it("kiest metadata vóór cookie/body", () => {
    expect(
      resolveAnonDistinctIdForAlias({
        userId: USER,
        fromMetadata: ANON,
        fromCookie: "019fbd91-7815-7c1a-a6f2-aaaaaaaaaaaa",
        fromBody: "019fbd91-7815-7c1a-a6f2-bbbbbbbbbbbb",
      })
    ).toBe(ANON);
  });

  it("negeert user.id als anon-kandidaat", () => {
    expect(
      resolveAnonDistinctIdForAlias({
        userId: USER,
        fromMetadata: USER,
        fromCookie: ANON,
      })
    ).toBe(ANON);
  });

  it("geeft null zonder geldige kandidaten", () => {
    expect(
      resolveAnonDistinctIdForAlias({
        userId: USER,
        fromMetadata: "not-a-uuid",
        fromCookie: null,
      })
    ).toBeNull();
  });
});
