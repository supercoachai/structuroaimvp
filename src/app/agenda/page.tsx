import { redirect } from "next/navigation";

/** Agenda tijdelijk uitgeschakeld: route bestaat niet meer voor eindgebruikers. */
export default function AgendaPage() {
  redirect("/");
}
