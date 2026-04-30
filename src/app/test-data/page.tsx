import { redirect } from "next/navigation";
import TestDataPageClient from "./TestDataPageClient";

export default function TestDataPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }
  return <TestDataPageClient />;
}
