import type {
  AuthorPage,
  CategorySummary,
  FullPost,
  Post,
  TagSummary,
} from "@opinly/backend";
import type { SeoResolved } from "@opinly/shared";

export type BlogRoutePrefixes = {
  categoryPrefix: string;
  authorPrefix: string;
  tagPrefix: string;
};

export const DEFAULT_BLOG_ROUTE_PREFIXES: BlogRoutePrefixes = {
  categoryPrefix: "category",
  authorPrefix: "authors",
  tagPrefix: "tag",
};

export type OpinlyRouteClient = {
  posts: (args?: {
    limit?: number;
    category?: string;
    author?: string;
    tag?: string;
  }) => Promise<{ data: Post[] }>;
  post: (slug: string) => Promise<FullPost | null>;
  categories: () => Promise<CategorySummary[]>;
  authors: () => Promise<{ data: Extract<AuthorPage, { type: "author" }>["data"][] }>;
  author: (slug: string) => Promise<AuthorPage>;
  tags: () => Promise<TagSummary[]>;
};

export type BlogRoute =
  | { type: "home"; data: { posts: Post[]; categories: CategorySummary[] } }
  | { type: "post"; data: FullPost }
  | {
      type: "category";
      data: {
        name: string;
        slug: string;
        description: string | null;
        posts: Post[];
      };
    }
  | {
      type: "tag";
      data: {
        name: string;
        slug: string;
        description: string | null;
        posts: Post[];
      };
    }
  | { type: "author"; data: Extract<AuthorPage, { type: "author" }>["data"] }
  | { type: "authors"; data: Extract<AuthorPage, { type: "author" }>["data"][] }
  | { type: "not-found" };

export function toBlogSeo(route: BlogRoute): SeoResolved {
  switch (route.type) {
    case "post":
      return { type: "post", data: route.data };
    case "category":
      return { type: "category", data: route.data };
    case "author":
      return { type: "author", data: route.data };
    case "tag":
      return { type: "tag", data: route.data };
    case "home":
      return { type: "home" };
    case "authors":
      return { type: "authors" };
    default:
      return { type: "not-found" };
  }
}

export async function loadBlogRoute(
  slug: string[],
  client: OpinlyRouteClient | null,
  prefixes: BlogRoutePrefixes = DEFAULT_BLOG_ROUTE_PREFIXES
): Promise<BlogRoute> {
  try {
    return await loadBlogRouteUnsafe(slug, client, prefixes);
  } catch (err) {
    console.error("[opinly] loadBlogRoute failed", err);
    if (slug.length === 0) {
      return { type: "home", data: { posts: [], categories: [] } };
    }
    return { type: "not-found" };
  }
}

async function loadBlogRouteUnsafe(
  slug: string[],
  client: OpinlyRouteClient | null,
  prefixes: BlogRoutePrefixes
): Promise<BlogRoute> {
  if (!client) {
    if (slug.length === 0) {
      return { type: "home", data: { posts: [], categories: [] } };
    }
    return { type: "not-found" };
  }

  if (slug.length === 0) {
    const [posts, categories] = await Promise.all([
      client.posts({ limit: 12 }),
      client.categories(),
    ]);
    return { type: "home", data: { posts: posts.data, categories } };
  }

  if (slug[0] === prefixes.categoryPrefix && slug[1]) {
    const [categories, list] = await Promise.all([
      client.categories(),
      client.posts({ category: slug[1] }),
    ]);
    const meta = categories.find((c) => c.slug === slug[1]);
    if (!meta) return { type: "not-found" };
    return {
      type: "category",
      data: {
        name: meta.title,
        slug: meta.slug,
        description: meta.description,
        posts: list.data,
      },
    };
  }

  if (slug[0] === prefixes.tagPrefix && slug[1] && slug.length === 2) {
    const [tags, list] = await Promise.all([
      client.tags(),
      client.posts({ tag: slug[1] }),
    ]);
    const meta = tags.find((t) => t.slug === slug[1]);
    if (!meta) return { type: "not-found" };
    return {
      type: "tag",
      data: {
        name: meta.name,
        slug: meta.slug,
        description: meta.description,
        posts: list.data,
      },
    };
  }

  if (slug[0] === prefixes.authorPrefix) {
    const authorSlug = slug[1];
    if (!authorSlug) {
      return { type: "authors", data: (await client.authors()).data };
    }
    if (slug.length !== 2) return { type: "not-found" };
    const author = await client.author(authorSlug);
    return author.type === "author"
      ? { type: "author", data: author.data }
      : { type: "not-found" };
  }

  if (slug.length !== 1) return { type: "not-found" };
  const post = await client.post(slug[0]);
  return post ? { type: "post", data: post } : { type: "not-found" };
}
