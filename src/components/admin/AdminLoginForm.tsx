"use client";

import { useState } from "react";
import type { AdminScope } from "@/lib/admin/adminSession";

export function AdminLoginForm({ scope }: { scope: AdminScope }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scope, secret }),
      });
      if (!res.ok) {
        setError("Onjuiste toegangscode");
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Er ging iets mis. Probeer opnieuw.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <label className="text-sm font-medium text-slate-700" htmlFor="admin-secret">
        Toegangscode
      </label>
      <input
        id="admin-secret"
        type="password"
        autoComplete="off"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !secret}
        className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
