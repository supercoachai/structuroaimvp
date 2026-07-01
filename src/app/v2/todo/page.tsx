import type { Metadata } from "next";

import TodoV2Client from "@/components/v2/TodoV2Client";

export const metadata: Metadata = {
  title: "Structuro v2 | Takenlijst",
  description: "Eén rustige lijst, prikkelarm.",
  robots: { index: false, follow: false },
};

export default function V2TodoPage() {
  return <TodoV2Client />;
}
