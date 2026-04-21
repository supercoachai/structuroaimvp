import { redirect } from "next/navigation";

/** Oude URL: dagstart gebeurt als overlay op home. */
export default function DagstartRedirectPage() {
  redirect("/");
}
