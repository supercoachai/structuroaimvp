import { describe, expect, it } from "vitest";

import { isOpinlyBlogPath } from "./marketingPaths";

describe("isOpinlyBlogPath", () => {
  it("herkent blog-index en nested paden", () => {
    expect(isOpinlyBlogPath("/blog")).toBe(true);
    expect(isOpinlyBlogPath("/blog/adhd-eerste-stap")).toBe(true);
    expect(isOpinlyBlogPath("/blog/category/adhd")).toBe(true);
  });

  it("raakt app-routes niet", () => {
    expect(isOpinlyBlogPath("/")).toBe(false);
    expect(isOpinlyBlogPath("/todo")).toBe(false);
    expect(isOpinlyBlogPath("/onboarding")).toBe(false);
  });
});
