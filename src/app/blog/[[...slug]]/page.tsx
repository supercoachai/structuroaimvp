import type { ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { generateOpinlyMetadata, opinlyConfig } from "@opinly/next";
import { routeParams } from "@opinly/shared";

import {
  AuthorView,
  AuthorsView,
  BlogIndex,
  BlogPost,
  CategoryView,
  TagView,
} from "@/components/blog/BlogViews";
import { getOpinlyClient } from "@/lib/opinly/client";
import { loadBlogRoute, toBlogSeo } from "@/lib/opinly/loadRoute";

export const revalidate = 3600;

const prefixes = {
  categoryPrefix: opinlyConfig.categoryPrefix ?? "category",
  authorPrefix: opinlyConfig.authorPrefix ?? "authors",
  tagPrefix: opinlyConfig.tagPrefix ?? "tag",
};

type BlogPageProps = { params: Promise<{ slug?: string[] }> };

async function resolveRoute(slug: string[]) {
  return loadBlogRoute(slug, getOpinlyClient(), prefixes);
}

export async function generateStaticParams() {
  const client = getOpinlyClient();
  if (!client) return [];
  try {
    const routes = await client.routes();
    return routes.map((route) => ({ slug: routeParams(opinlyConfig, route) }));
  } catch (err) {
    console.error("[opinly] generateStaticParams failed", err);
    return [];
  }
}

export async function generateMetadata(
  props: BlogPageProps,
  parent: ResolvingMetadata
) {
  const { slug } = await props.params;
  return generateOpinlyMetadata(toBlogSeo(await resolveRoute(slug ?? [])), parent);
}

export default async function BlogPage(props: BlogPageProps) {
  const { slug } = await props.params;
  const route = await resolveRoute(slug ?? []);

  switch (route.type) {
    case "home":
      return <BlogIndex data={route.data} />;
    case "post":
      return <BlogPost post={route.data} />;
    case "category":
      return <CategoryView category={route.data} />;
    case "tag":
      return <TagView tag={route.data} />;
    case "author":
      return <AuthorView author={route.data} />;
    case "authors":
      return <AuthorsView authors={route.data} />;
    default:
      notFound();
  }
}
