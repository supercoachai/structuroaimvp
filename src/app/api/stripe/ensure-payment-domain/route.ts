import { getAppOrigin } from "@/lib/appUrl";
import { createStripeServerClientFromEnv } from "@/lib/stripe/syncProfileSubscription";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function hostnameFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

async function postEnsurePaymentDomain() {
  const stripe = await createStripeServerClientFromEnv();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const originHost = hostnameFromOrigin(getAppOrigin());
  const candidates = ["structuro.ai", "www.structuro.ai", originHost].filter(
    (d): d is string => Boolean(d && !d.includes("localhost"))
  );
  const domains = [...new Set(candidates)];

  const results: Array<{ domain: string; status: string }> = [];

  for (const domain_name of domains) {
    try {
      await stripe.paymentMethodDomains.create({ domain_name });
      results.push({ domain: domain_name, status: "created" });
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (
        code === "payment_method_domain_already_exists" ||
        code === "resource_already_exists"
      ) {
        results.push({ domain: domain_name, status: "exists" });
        continue;
      }
      results.push({ domain: domain_name, status: "error" });
    }
  }

  return NextResponse.json({ ok: true, results });
}

export const POST = withApiErrorTracking(
  "POST /api/stripe/ensure-payment-domain",
  postEnsurePaymentDomain
);
