export const revalidate = 3600;

const BODY = `# Structuro app

> Product host. Knowledge lives at https://www.structuro.eu/llms.txt

Structuro is the Dutch ADHD execution web app (structuro.ai). Not the steel company structuro.nl, not Structured.app.

Start here: https://www.structuro.ai/onboarding (anonymous day start).

Guides, research and founder story: https://www.structuro.eu/
`;

export async function GET() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
