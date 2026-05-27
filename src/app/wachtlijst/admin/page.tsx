import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export const metadata: Metadata = {
  title: "Wachtlijst beheer",
  robots: { index: false, follow: false },
};

type Row = {
  email: string;
  name: string;
  created_at: string;
  source: string | null;
};

export default async function WachtlijstAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const expected = process.env.WACHTLIJST_ADMIN_SECRET?.trim() ?? "";
  const k = ((await searchParams).k ?? "").trim();

  if (!expected || k !== expected) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[var(--st-bg)] px-4 text-sm text-slate-500">
        Niet gevonden
      </div>
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[var(--st-bg)] px-4 text-center text-sm text-red-700">
        SUPABASE_SERVICE_ROLE_KEY ontbreekt op de server.
      </div>
    );
  }

  const { count, error: countErr } = await admin
    .from("wachtlijst")
    .select("*", { count: "exact", head: true });

  const { data: rows, error } = await admin
    .from("wachtlijst")
    .select("email, name, created_at, source")
    .order("created_at", { ascending: false })
    .limit(20);

  if (countErr || error) {
    console.error("[wachtlijst/admin]", countErr ?? error);
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[var(--st-bg)] px-4 text-sm text-red-700">
        Kon gegevens niet laden.
      </div>
    );
  }

  const list = (rows ?? []) as Row[];

  return (
    <div className="min-h-[100dvh] bg-[var(--st-bg)] px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="mx-auto max-w-2xl">
        <p className="mb-6 text-xs text-slate-400">
          Privé-view. Pagina heeft geen index voor zoekmachines.
        </p>
        <h1 className="mb-2 text-lg font-semibold text-slate-800">Wachtlijst</h1>
        <p className="mb-8 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{count ?? 0}</span> aanmeldingen
          totaal · laatste 20 hieronder.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Aangemeld</th>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Bron</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Nog geen rijen.
                  </td>
                </tr>
              ) : (
                list.map((r) => (
                  <tr key={`${r.email}-${r.created_at}`} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                      {new Date(r.created_at).toLocaleString("nl-NL", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="max-w-[120px] truncate px-4 py-2.5 font-medium text-slate-800" title={r.name}>
                      {r.name}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-slate-700" title={r.email}>
                      {r.email}
                    </td>
                    <td className="truncate px-4 py-2.5 text-slate-500">{r.source ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
