import { describe, expect, it } from "vitest";

import { opinlyAnonMetadata, stripeCentsToMajor } from "./anon";
import { parseOpinlyAnonId } from "./trackServer";

describe("parseOpinlyAnonId", () => {
  it("accepteert een korte id", () => {
    expect(parseOpinlyAnonId("abc_123")).toBe("abc_123");
  });

  it("wijst lege of te lange waarden af", () => {
    expect(parseOpinlyAnonId("")).toBeUndefined();
    expect(parseOpinlyAnonId("x".repeat(129))).toBeUndefined();
    expect(parseOpinlyAnonId(12)).toBeUndefined();
  });
});

describe("opinlyAnonMetadata", () => {
  it("zet de Stripe-metadata-sleutel", () => {
    expect(opinlyAnonMetadata("abc")).toEqual({ opinly_anon_id: "abc" });
    expect(opinlyAnonMetadata(undefined)).toEqual({});
  });
});

describe("stripeCentsToMajor", () => {
  it("zet centen om naar euro's", () => {
    expect(stripeCentsToMajor(1299)).toBe(12.99);
    expect(stripeCentsToMajor(0)).toBe(0);
    expect(stripeCentsToMajor(null)).toBe(0);
  });
});
