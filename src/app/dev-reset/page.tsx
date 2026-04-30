import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Geen aparte reset-API op deze route: in development verwijzen we naar home
 * waar de dev-toolbar staat (NEXT_PUBLIC_STRUCTURO_DEV_RESET).
 */
export default function DevResetPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-4 px-6 py-12 text-center font-sans">
      <h1 className="text-xl font-semibold text-slate-900">Development</h1>
      <p className="text-sm text-slate-600">
        Data-reset zit op het home-scherm via de development-knoppen (alleen als
        NEXT_PUBLIC_STRUCTURO_DEV_RESET aan staat).
      </p>
      <Link href="/" className="text-sm font-medium text-blue-600 underline">
        Naar home
      </Link>
    </div>
  );
}
