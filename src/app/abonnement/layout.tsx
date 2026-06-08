import { Hanken_Grotesk } from "next/font/google";
import { AbonnementStripeWarmup } from "./AbonnementStripeWarmup";
import { AbonnementToastHost } from "./AbonnementToastHost";
import "./retention-paywall.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function AbonnementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://js.stripe.com" />
      <div className={`retention-paywall ${hanken.className}`}>
      <AbonnementStripeWarmup />
      {children}
      <AbonnementToastHost />
    </div>
    </>
  );
}
