import type { ReactNode } from "react";

import { BlogChrome } from "@/components/blog/BlogChrome";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <BlogChrome>{children}</BlogChrome>
    </div>
  );
}
