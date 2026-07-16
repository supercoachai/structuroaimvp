import type { Metadata } from "next";
import Link from "next/link";

import { V2Eyebrow, V2Header, V2Page } from "@/components/v2/V2Chrome";
import { v2Styles } from "@/components/v2/theme";

export const metadata: Metadata = {
  title: "Structuro v2 (testomgeving)",
  description: "De v2-testomgeving van Structuro. Loop de hele reis rustig door.",
  robots: { index: false, follow: false },
};

type V2Surface = { href: string; title: string; desc: string };

const SURFACES: V2Surface[] = [
  { href: "/v2/onboarding", title: "Onboarding", desc: "De nieuwe, rustige eerste reis." },
  { href: "/v2/home", title: "Home", desc: "Je ene ding van vandaag, met afronden." },
  { href: "/v2/dagstart", title: "Dagstart", desc: "Energie kiezen en een ding pakken." },
  { href: "/v2/dump", title: "Dump", desc: "Extern geheugen. Loslaten zonder te vergeten." },
  { href: "/v2/todo", title: "Takenlijst", desc: "Eén lijst, prikkelarm." },
  { href: "/v2/focus", title: "Focus", desc: "Een ding, rustige timer." },
  { href: "/v2/shutdown", title: "Dagafsluiting", desc: "De lus dichtdoen. Leeg mag ook." },
  { href: "/v2/settings", title: "Instellingen", desc: "Reminders, tour, data. Alles opt-in." },
  { href: "/v2/install", title: "Installeren", desc: "Beginscherm-hint voor mobiel." },
  { href: "/v2/abonnement", title: "Abonnement", desc: "Paywall in v2-stijl." },
  { href: "/v2/jasper", title: "Jasper-landing", desc: "Variant voor podcastluisteraars." },
  { href: "/v2/login", title: "Inloggen", desc: "Preview: magic-link-flow, geen echte auth." },
  { href: "/v2/register", title: "Account", desc: "Preview: licht aanmaken, lokaal." },
];

export default function V2EntryPage() {
  return (
    <V2Page>
      <V2Header />

      <section className="v2-fade" style={v2Styles.card}>
        <V2Eyebrow>Testomgeving</V2Eyebrow>
        <h1 style={v2Styles.title}>Dit is de v2 van Structuro.</h1>
        <p style={v2Styles.body}>
          Hier loop je de hele reis rustig door, met alle verbeteringen ingebouwd.
          Een huisstijl over alles, van de site tot diep in de app. Geen account
          nodig, niets gaat kapot. Begin gewoon en stop wanneer je wilt.
        </p>
        <div style={v2Styles.actions}>
          <Link href="/v2/onboarding" className="btn-primary">
            Start de reis
          </Link>
          <Link href="/v2/home" className="btn-ghost">
            Toon volledige app
          </Link>
          <p style={{ ...v2Styles.body, fontSize: 13, textAlign: "center" }}>
            De volledige app opent in dezelfde rustige huisstijl, met eigen navigatie.
          </p>
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
