import { NextResponse } from "next/server";

/** OG-wachtlijst: pas activeren wanneer OG-actie live is + migratie og_waitlist draaien. */
export async function POST() {
  return NextResponse.json(
    { error: "Wachtlijst nog niet geopend" },
    { status: 503 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Wachtlijst nog niet geopend" },
    { status: 503 }
  );
}
