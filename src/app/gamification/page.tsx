import { redirect } from "next/navigation";

/** Gamification staat niet in de MVP: route doorverwijzen naar home. */
export default function GamificationPage() {
  redirect("/");
}
