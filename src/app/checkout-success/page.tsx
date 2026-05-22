import { redirect } from "next/navigation";

/** Redirect voor Stripe success_url variant; productie gebruikt /abonnement?from=stripe. */
export default function CheckoutSuccessPage() {
  redirect("/abonnement?from=stripe");
}
