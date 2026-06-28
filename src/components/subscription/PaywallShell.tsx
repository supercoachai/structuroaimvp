"use client";

import type { ReactNode } from "react";
import type { RetentionPaywallReason } from "@/lib/retentionPaywallAccess";
import type { WalletKind } from "@/lib/stripe/walletBootstrap";
import { PaywallInteractive } from "./PaywallInteractive";
import { PaywallStatsProvider, usePaywallStats } from "./PaywallStatsContext";

type PaywallShellProps = {
  reason: RetentionPaywallReason;
  trialDays: number;
  visibleWallets: WalletKind[];
  statsSlot: ReactNode;
};

function PaywallInteractiveWithStats({
  reason,
  visibleWallets,
}: {
  reason: RetentionPaywallReason;
  visibleWallets: WalletKind[];
}) {
  const { stats } = usePaywallStats();
  return (
    <PaywallInteractive reason={reason} visibleWallets={visibleWallets} stats={stats} />
  );
}

export function PaywallShell({
  reason,
  trialDays,
  visibleWallets,
  statsSlot,
}: PaywallShellProps) {
  const kicker =
    reason === "subscription_ended"
      ? "Je toegang is beëindigd"
      : "Je proefperiode is voorbij";

  return (
    <PaywallStatsProvider>
      <main className="screen">
        <section>
          <p className="kicker">{kicker}</p>
          <h1>
            Dit bouwde je in
            <br />
            {trialDays} dagen op.
          </h1>

          <div className="built">
            <p className="built-label">JOUW STRUCTURO TOT NU TOE</p>
            {statsSlot}
          </div>

          <p className="lead">
            {trialDays} dagen lang hield Structuro je op koers. Je ritme, je
            lijsten, je rust: die blijven precies zoals ze nu zijn.{" "}
            <strong>Stop je vandaag, dan stopt dit ook.</strong>
          </p>
        </section>

        <PaywallInteractiveWithStats reason={reason} visibleWallets={visibleWallets} />

        <section className="proof">
          <p className="proof-head">Dit zeggen mensen die bleven</p>
          <div className="card">
            <p>
              &quot;Andere apps gaf ik na 3 dagen op. Structuro is de eerste die
              ik vol blijf houden.&quot;
            </p>
            <div className="by">
              <span className="avatar a1">JV</span>
              <span>Jorinde V.</span>
            </div>
          </div>
          <div className="card">
            <p>
              &quot;Het denkt niet voor me, maar het houdt me wel vast als ik
              afdwaal. Precies genoeg.&quot;
            </p>
            <div className="by">
              <span className="avatar a2">DK</span>
              <span>Daan K.</span>
            </div>
          </div>
          <p className="trust">
            Veilig betalen via iDEAL, creditcard, Apple Pay of Google Pay.
            <br />
            Je gegevens en lijsten blijven van jou.
          </p>
        </section>
      </main>
    </PaywallStatsProvider>
  );
}
