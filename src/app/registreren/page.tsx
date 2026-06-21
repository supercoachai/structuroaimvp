import type { Metadata } from "next";
import { cookies } from "next/headers";

import RegistrerenAccountClient from "@/components/registreren/RegistrerenAccountClient";
import { STRUCTURO_SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase/authStorage";

export const metadata: Metadata = {
  title: "Account aanmaken | Structuro",
  description:
    "Maak je Structuro-account aan en start je gratis proefperiode.",
};

/**
 * Bepaal server-side of dit de "Bewaar je dagstart"-variant is (anonieme
 * gebruiker die net de eerste dagstart deed). Zo rendert SSR meteen de juiste
 * koptekst en zie je geen flits van de acquisitie-variant naar de dagstart-copy.
 */
export default async function RegistrerenPage() {
  const cookieStore = await cookies();
  const hasLocalMode = Boolean(cookieStore.get("structuro_local_mode")?.value);
  const hasAuthHint = cookieStore.getAll().some(({ name }) => {
    return (
      name === STRUCTURO_SUPABASE_AUTH_STORAGE_KEY ||
      name.startsWith(`${STRUCTURO_SUPABASE_AUTH_STORAGE_KEY}.`)
    );
  });
  const initialPostDagstart = hasLocalMode && !hasAuthHint;

  return <RegistrerenAccountClient initialPostDagstart={initialPostDagstart} />;
}
