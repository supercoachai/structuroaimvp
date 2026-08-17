import { redirect } from "next/navigation";

/** Legacy v1-route. Permanent dicht: nooit meer AppLayout/v1-dagstart. */
export default function UitlegPage() {
  redirect("/");
}
