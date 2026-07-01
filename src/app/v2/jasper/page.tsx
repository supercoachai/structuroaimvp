import type { Metadata } from "next";
import Link from "next/link";

import { V2Header, V2Page } from "@/components/v2/V2Chrome";
import { v2Styles } from "@/components/v2/theme";

export const metadata: Metadata = {
  title: "Structuro v2 | Welkom, luisteraar van Jasper",
  description: "Speciaal voor luisteraars van Jasper. Rustig kennismaken met Structuro.",
  robots: { index: false, follow: false },
};

export default function V2JasperPage() {
  return (
    <V2Page>
      <V2Header exitHref="/v2" />

      <section className="v2-fade" style={v2Styles.card}>
        <p style={v2Styles.kicker}>Via de podcast van Jasper</p>
        <h1 style={v2Styles.title}>Welkom. Fijn dat je er bent.</h1>
        <p style={v2Styles.body}>
          Je hoorde Jasper over Structuro. Geen druk: dit is een rustige plek waar je
          één ding tegelijk doet. Geen prikkels die schreeuwen, geen lange lijst.
        </p>
        <div style={v2Styles.resultCard}>
          <p style={v2Styles.resultThing}>Eén klein ding per dag is genoeg.</p>
          <p style={v2Styles.resultAnchor}>
            Begin zonder account. Bewaren kan altijd later.
          </p>
        </div>
        <div style={v2Styles.actions}>
          <Link href="/v2/onboarding" className="v2-cta" style={v2Styles.cta}>
            Rustig beginnen
          </Link>
          <Link href="/v2/login" className="v2-textlink" style={v2Styles.textlink}>
            Ik heb al een account
          </Link>
        </div>
      </section>
    </V2Page>
  );
}
