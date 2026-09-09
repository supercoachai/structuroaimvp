import { OpinlyContent } from "@opinly/react";
import { opinlyConfig } from "@opinly/next";
import type { OpinlyNode } from "@opinly/shared";

const config = {
  imagesPrefix: opinlyConfig.imagesPrefix || "/opinly-images",
  siteUrl: opinlyConfig.siteUrl,
  blogPrefix: opinlyConfig.blogPrefix || "/blog",
  siteName: opinlyConfig.siteName || "Structuro",
};

export function PostContent({ content }: { content: OpinlyNode }) {
  return (
    <div className="opinly-prose">
      <OpinlyContent
        content={content}
        config={config}
        classNames={{
          paragraph: "mb-4 text-[1.05rem] leading-7 text-[var(--story-text)]",
          heading: "st-story-serif mt-8 mb-3 font-semibold tracking-tight text-[var(--story-text)]",
          image: "my-6 w-full rounded-2xl",
          bulletList: "mb-4 list-disc space-y-1 pl-5 text-[var(--story-text)]",
          orderedList: "mb-4 list-decimal space-y-1 pl-5 text-[var(--story-text)]",
          listItem: "leading-7",
          blockquote:
            "my-6 border-l-4 border-[var(--story-accent)] pl-4 text-[var(--story-text-muted)]",
          code: "rounded bg-[var(--story-bg)] px-1 py-0.5 text-[0.95em]",
          codeBlock:
            "my-6 overflow-x-auto rounded-2xl bg-[#1A2340] p-4 text-sm text-[#F5F2EA]",
          horizontalRule: "my-8 border-[var(--story-border)]",
          table: "my-6 w-full border-collapse text-sm",
          link: "underline decoration-[var(--story-accent)] underline-offset-2",
        }}
      />
    </div>
  );
}
