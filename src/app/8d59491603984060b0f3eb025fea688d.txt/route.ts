import { INDEXNOW_KEY } from "@/lib/indexNow";

export const revalidate = 86400;

export async function GET() {
  return new Response(`${INDEXNOW_KEY}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
