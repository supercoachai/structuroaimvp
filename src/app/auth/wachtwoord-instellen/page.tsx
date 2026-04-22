"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordInstellenPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) {
          setHasSession(Boolean(data.user?.id));
        }
      } catch {
        if (!cancelled) setHasSession(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Wachtwoord moet minimaal 6 tekens zijn.");
      return;
    }
    if (password !== confirm) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: upErr } = await supabase.auth.updateUser({
        password,
      });
      if (upErr) {
        setError(upErr.message || "Opslaan mislukt.");
        return;
      }
      await supabase.auth.signOut();
      router.push("/login?wachtwoord=bijgewerkt");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F6FB] text-slate-600">
        Bezig met laden…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[#F4F6FB] px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Geen geldige sessie
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Open eerst de link uit je mail, of vraag een nieuw wachtwoord aan.
            Oude links werken niet meer.
          </p>
          <Link
            href="/login?herstel=1"
            className="mt-6 block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            Nieuw wachtwoord aanvragen
          </Link>
          <Link
            href="/login"
            className="mt-3 block w-full text-center text-sm text-slate-600 underline"
          >
            Naar inloggen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center bg-[#F4F6FB] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Nieuw wachtwoord
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Kies een nieuw wachtwoord voor je account.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="np"
              className="block text-sm font-medium text-slate-700"
            >
              Nieuw wachtwoord
            </label>
            <input
              id="np"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              minLength={6}
              required
            />
          </div>
          <div>
            <label
              htmlFor="npc"
              className="block text-sm font-medium text-slate-700"
            >
              Bevestigen
            </label>
            <input
              id="npc"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              minLength={6}
              required
            />
          </div>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Opslaan…" : "Wachtwoord opslaan"}
          </button>
        </form>
      </div>
    </div>
  );
}
