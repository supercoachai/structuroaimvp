import { NextResponse } from "next/server";

import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

const DEMO_TASKS = [
  { id: "g-demo-1", title: "Reactie sturen op mail van team" },
  { id: "g-demo-2", title: "Boodschappen halen voor vrijdag" },
  { id: "g-demo-3", title: "Afspraak verzetten met tandarts" },
] as const;

async function getGoogleImport(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("demo") !== "1") {
    return NextResponse.json(
      { ok: false, error: "demo_only", message: "Alleen demomodus beschikbaar in v2 test." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: "google-demo",
    label: "Demotaken (geen echte Google-koppeling)",
    tasks: DEMO_TASKS.map((task) => ({ ...task })),
  });
}

export const GET = withApiErrorTracking("GET /api/v2/import/google", getGoogleImport);
