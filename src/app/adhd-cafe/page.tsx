import { redirect } from "next/navigation";
import { ADHD_CAFE_REGISTREREN_PATH } from "@/lib/stripe/trialConfig";

/** QR-link: meteen door naar registratie met 14-dagen trial-attributie. */
export default function AdhdCafePage() {
  redirect(ADHD_CAFE_REGISTREREN_PATH);
}
