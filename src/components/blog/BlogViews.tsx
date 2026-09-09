import Link from "next/link";
import {
  OpinlyJsonLd,
  buildBlogPostingJsonLd,
  buildFaqJsonLd,
  opinlyConfig,
} from "@opinly/next";
import { imageUrl } from "@opinly/shared";
import type {
  AuthorPage,
  CategorySummary,
  FullPost,
  Post,
} from "@opinly/backend";
import type { OpinlyNode } from "@opinly/shared";

import { PostContent } from "./PostContent";

const START_HREF =
  "/onboarding?utm_source=structuro_eu&utm_medium=organic&utm_campaign=blog";

function formatNlDate(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(
    new Date(iso)
  );
}

function imageConfig() {
  return {
    imagesPrefix: opinlyConfig.imagesPrefix || "/opinly-images",
    siteUrl: opinlyConfig.siteUrl,
  };
}

function postHref(slug: string): string {
  return `/blog/${slug}`;
}

function categoryHref(slug: string): string {
  const prefix = opinlyConfig.categoryPrefix ?? "category";
  return `/blog/${prefix}/${slug}`;
}

function authorHref(slug: string): string {
  const prefix = opinlyConfig.authorPrefix ?? "authors";
  return `/blog/${prefix}/${slug}`;
}

function PostCard({ post }: { post: Post }) {
  const img = imageUrl(post.image?.fileKey, imageConfig());
  return (
    <article className="border-b border-[var(--story-border)] py-6 first:pt-0">
      <p className="st-story-eyebrow mb-2">
        {formatNlDate(post.firstPublishedAt)}
        {post.category ? ` · ${post.category.name}` : ""}
      </p>
      <h2 className="st-story-serif text-2xl font-semibold tracking-tight">
        <Link href={postHref(post.slug)}>{post.title}</Link>
      </h2>
      {post.description ? (
        <p className="mt-2 text-[var(--story-text-muted)]">{post.description}</p>
      ) : null}
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={post.image?.alt ?? ""}
          className="mt-4 w-full rounded-2xl"
        />
      ) : null}
    </article>
  );
}

function EmptyPosts() {
  return (
    <p className="text-[var(--story-text-muted)]">
      Er staan nog geen artikelen klaar. Kijk later nog eens, of{" "}
      <Link href={START_HREF} className="underline underline-offset-2">
        start gratis
      </Link>.
    </p>
  );
}

export function BlogIndex({
  data,
}: {
  data: { posts: Post[]; categories: CategorySummary[] };
}) {
  return (
    <div>
      <p className="st-story-eyebrow mb-3">Blog</p>
      <h1 className="st-story-serif text-4xl font-semibold tracking-tight">
        Rustiger beginnen, elke dag
      </h1>
      <p className="mt-3 max-w-xl text-[var(--story-text-muted)]">
        Artikelen over ADHD, energie en een eerste stap die klein genoeg is om
        te doen.
      </p>
      {data.categories.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          {data.categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={categoryHref(category.slug)}
                className="rounded-full border border-[var(--story-border)] px-3 py-1 text-sm"
              >
                {category.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-10">
        {data.posts.length === 0 ? <EmptyPosts /> : data.posts.map((post) => <PostCard key={post.slug} post={post} />)}
      </div>
    </div>
  );
}

export function BlogPost({ post }: { post: FullPost }) {
  const hero = imageUrl(post.titleFile?.fileKey, imageConfig());
  return (
    <article>
      <OpinlyJsonLd data={buildBlogPostingJsonLd(post)} />
      {post.faqs?.length ? (
        <OpinlyJsonLd data={buildFaqJsonLd(post.faqs)} />
      ) : null}
      <p className="st-story-eyebrow mb-3">
        <Link href="/blog">Blog</Link>
        {post.category ? (
          <>
            {" · "}
            <Link href={categoryHref(post.category.slug)}>
              {post.category.name}
            </Link>
          </>
        ) : null}
      </p>
      <h1 className="st-story-serif text-4xl font-semibold tracking-tight">
        {post.title}
      </h1>
      <p className="mt-3 text-sm text-[var(--story-text-muted)]">
        {formatNlDate(post.firstPublishedAt)}
        {post.author ? (
          <>
            {" · "}
            <Link href={authorHref(post.author.slug)}>{post.author.name}</Link>
          </>
        ) : null}
      </p>
      {post.description ? (
        <p className="mt-4 text-lg text-[var(--story-text-muted)]">
          {post.description}
        </p>
      ) : null}
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero}
          alt={post.titleFile?.altText ?? ""}
          className="mt-8 w-full rounded-2xl"
        />
      ) : null}
      <div className="mt-8">
        <PostContent content={post.content as OpinlyNode} />
      </div>
    </article>
  );
}

export function CategoryView({
  category,
}: {
  category: {
    name: string;
    slug: string;
    description: string | null;
    posts: Post[];
  };
}) {
  return (
    <div>
      <p className="st-story-eyebrow mb-3">
        <Link href="/blog">Blog</Link>
      </p>
      <h1 className="st-story-serif text-4xl font-semibold tracking-tight">
        {category.name}
      </h1>
      {category.description ? (
        <p className="mt-3 text-[var(--story-text-muted)]">
          {category.description}
        </p>
      ) : null}
      <div className="mt-10">
        {category.posts.length === 0 ? (
          <EmptyPosts />
        ) : (
          category.posts.map((post) => <PostCard key={post.slug} post={post} />)
        )}
      </div>
    </div>
  );
}

export function TagView({
  tag,
}: {
  tag: {
    name: string;
    slug: string;
    description: string | null;
    posts: Post[];
  };
}) {
  return (
    <div>
      <p className="st-story-eyebrow mb-3">
        <Link href="/blog">Blog</Link>
      </p>
      <h1 className="st-story-serif text-4xl font-semibold tracking-tight">
        {tag.name}
      </h1>
      {tag.description ? (
        <p className="mt-3 text-[var(--story-text-muted)]">{tag.description}</p>
      ) : null}
      <div className="mt-10">
        {tag.posts.length === 0 ? (
          <EmptyPosts />
        ) : (
          tag.posts.map((post) => <PostCard key={post.slug} post={post} />)
        )}
      </div>
    </div>
  );
}

export function AuthorView({
  author,
}: {
  author: Extract<AuthorPage, { type: "author" }>["data"];
}) {
  return (
    <div>
      <p className="st-story-eyebrow mb-3">
        <Link href="/blog">Blog</Link>
      </p>
      <h1 className="st-story-serif text-4xl font-semibold tracking-tight">
        {author.name}
      </h1>
      {author.bio ? (
        <p className="mt-3 text-[var(--story-text-muted)]">{author.bio}</p>
      ) : null}
      <div className="mt-10">
        {author.posts.length === 0 ? (
          <EmptyPosts />
        ) : (
          author.posts.map((post) => <PostCard key={post.slug} post={post} />)
        )}
      </div>
    </div>
  );
}

export function AuthorsView({
  authors,
}: {
  authors: Extract<AuthorPage, { type: "author" }>["data"][];
}) {
  return (
    <div>
      <p className="st-story-eyebrow mb-3">
        <Link href="/blog">Blog</Link>
      </p>
      <h1 className="st-story-serif text-4xl font-semibold tracking-tight">
        Auteurs
      </h1>
      <ul className="mt-8 space-y-4">
        {authors.map((author) => (
          <li key={author.slug}>
            <Link
              href={authorHref(author.slug)}
              className="st-story-serif text-2xl font-semibold"
            >
              {author.name}
            </Link>
            {author.bio ? (
              <p className="mt-1 text-[var(--story-text-muted)]">{author.bio}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
