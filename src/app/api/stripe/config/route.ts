import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Publieke Stripe-config voor wallet-knoppen (publishable key is bedoeld voor de browser). */
export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!publishableKey) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
  return NextResponse.json({
    configured: true,
    publishableKey,
  });
}
