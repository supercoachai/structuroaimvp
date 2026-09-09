import { redirect } from "next/navigation";

/** Redirect voor Stripe success_url variant; productie gebruikt /abonnement?from=stripe. */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams({ from: "stripe" });
  const sessionId = params.session_id?.trim();
  if (sessionId?.startsWith("cs_")) q.set("session_id", sessionId);
  redirect(`/abonnement?${q.toString()}`);
}
