import type { Metadata } from "next";
import Link from "next/link";

import { V2Eyebrow, V2Header, V2Page } from "@/components/v2/V2Chrome";
import { v2Styles } from "@/components/v2/theme";

export const metadata: Metadata = {
  title: "Structuro lab (intern)",
  description: "Interne v2 scherm-directory. Niet publiek.",
  robots: { index: false, follow: false },
};

type V2Surface = { href: string; title: string; desc: string };

const SURFACES: V2Surface[] = [
  { href: "/onboarding", title: "Onboarding", desc: "De nieuwe, rustige eerste reis." },
  { href: "/", title: "Home", desc: "Je ene ding van vandaag, met afronden." },
  { href: "/dagstart", title: "Dagstart", desc: "Energie kiezen en een ding pakken." },
  { href: "/dump", title: "Dump", desc: "Extern geheugen. Loslaten zonder te vergeten." },
  { href: "/todo", title: "Takenlijst", desc: "Eén lijst, prikkelarm." },
  { href: "/focus", title: "Focus", desc: "Een ding, rustige timer." },
  { href: "/shutdown", title: "Dagafsluiting", desc: "De lus dichtdoen. Leeg mag ook." },
  { href: "/settings", title: "Instellingen", desc: "Reminders, tour, data. Alles opt-in." },
  { href: "/welkom/install", title: "Installeren", desc: "Beginscherm-hint voor mobiel." },
  { href: "/abonnement", title: "Abonnement", desc: "Paywall in v2-stijl." },
  { href: "/v2/jasper", title: "Jasper-landing", desc: "Variant voor podcastluisteraars." },
  { href: "/login", title: "Inloggen", desc: "Google of e-mail. Echte auth naar /." },
];

export default function V2EntryPage() {
  return (
    <V2Page>
      <V2Header />

      <section className="v2-fade" style={v2Styles.card}>
        <V2Eyebrow>Intern lab</V2Eyebrow>
        <h1 style={v2Styles.title}>v2 scherm-directory</h1>
        <p style={v2Styles.body}>
          Alleen voor team/testaccounts. Publiek wordt hier weggeleid.
        </p>
        <div style={v2Styles.actions}>
          <Link href="/onboarding" className="btn-primary">
            Start de reis
          </Link>
          <Link href="/" className="btn-ghost">
            Toon volledige app
          </Link>
        </div>
      </section>

      <section style={{ ...v2Styles.card, gap: 12 }}>
        <h2 style={{ ...v2Styles.title, fontSize: 17 }}>Of spring direct ergens in</h2>
        <nav style={v2Styles.navList} aria-label="v2 schermen">
          {SURFACES.map((s) => (
            <Link key={s.href} href={s.href} className="v2-nav" style={v2Styles.navItem}>
              <span style={v2Styles.navItemTitle}>{s.title}</span>
              <span style={v2Styles.navItemDesc}>{s.desc}</span>
            </Link>
          ))}
        </nav>
      </section>
    </V2Page>
  );
}
