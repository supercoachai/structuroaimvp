import { describe, expect, it } from "vitest";

import { loadBlogRoute, toBlogSeo, type OpinlyRouteClient } from "./loadRoute";

function client(overrides: Partial<OpinlyRouteClient> = {}): OpinlyRouteClient {
  return {
    posts: async () => ({ data: [] }),
    post: async () => null,
    categories: async () => [],
    authors: async () => ({ data: [] }),
    author: async () => ({ type: "not-found", data: undefined }),
    tags: async () => [],
    ...overrides,
  };
}

describe("loadBlogRoute", () => {
  it("geeft een lege home zonder client", async () => {
    const route = await loadBlogRoute([], null);
    expect(route).toEqual({ type: "home", data: { posts: [], categories: [] } });
  });

  it("geeft not-found voor een slug zonder client", async () => {
    const route = await loadBlogRoute(["missing"], null);
    expect(route.type).toBe("not-found");
  });

  it("laadt de index via posts en categories", async () => {
    const route = await loadBlogRoute(
      [],
      client({
        posts: async () => ({
          data: [
            {
              slug: "eerste",
              title: "Eerste",
              description: "Hallo",
              firstPublishedAt: "2026-09-01T00:00:00.000Z",
              lastPublishedAt: "2026-09-01T00:00:00.000Z",
              image: null,
              category: null,
              author: null,
              tags: [],
            },
          ],
        }),
        categories: async () => [
          {
            slug: "adhd",
            title: "ADHD",
            description: null,
            imageUrl: null,
            posts: [],
          },
        ],
      })
    );
    expect(route.type).toBe("home");
    if (route.type === "home") {
      expect(route.data.posts[0]?.slug).toBe("eerste");
      expect(route.data.categories[0]?.slug).toBe("adhd");
    }
  });

  it("laadt een category-archief", async () => {
    const route = await loadBlogRoute(
      ["category", "adhd"],
      client({
        categories: async () => [
          {
            slug: "adhd",
            title: "ADHD",
            description: "Over ADHD",
            imageUrl: null,
            posts: [],
          },
        ],
        posts: async (args) => ({
          data:
            args?.category === "adhd"
              ? [
                  {
                    slug: "eerste",
                    title: "Eerste",
                    description: "",
                    firstPublishedAt: "2026-09-01T00:00:00.000Z",
                    lastPublishedAt: "2026-09-01T00:00:00.000Z",
                    image: null,
                    category: { slug: "adhd", name: "ADHD", description: "" },
                    author: null,
                    tags: [],
                  },
                ]
              : [],
        }),
      })
    );
    expect(route.type).toBe("category");
    if (route.type === "category") {
      expect(route.data.name).toBe("ADHD");
      expect(route.data.posts).toHaveLength(1);
    }
  });

  it("mapt post-routes naar SeoResolved", async () => {
    const seo = toBlogSeo({ type: "not-found" });
    expect(seo.type).toBe("not-found");
  });
});
