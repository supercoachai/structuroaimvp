import { NextResponse } from "next/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

async function postOgSignup(_request: Request) {
  return NextResponse.json(
    { error: "Wachtlijst nog niet geopend" },
    { status: 503 }
  );
}

async function getOgSignup(_request: Request) {
  return NextResponse.json(
    { error: "Wachtlijst nog niet geopend" },
    { status: 503 }
  );
}

export const POST = withApiErrorTracking("POST /api/og-signup", postOgSignup);
export const GET = withApiErrorTracking("GET /api/og-signup", getOgSignup);
