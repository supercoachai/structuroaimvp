"use client";

import { useState } from "react";

type Props = {
  onComplete: (displayName: string) => void | Promise<void>;
};

export default function LocalNamePrompt({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Vul je voornaam in.");
      return;
    }
    if (trimmed.length > 80) {
      setError("Houd het kort (max. 80 tekens).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onComplete(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-8 overflow-y-auto">
      <div
        className="max-w-md w-full rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-100/90"
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)",
        }}
      >
        <div className="flex justify-center mb-8">
          {logoError ? (
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <span className="text-white font-bold text-3xl">S</span>
            </div>
          ) : (
            <img
              src="/Logo Structuro.png"
              alt="Structuro"
              width={112}
              height={112}
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-sm shrink-0"
              onError={() => setLogoError(true)}
            />
          )}
        </div>

        <h1 className="text-center text-lg sm:text-xl text-gray-900 font-semibold leading-snug mb-8">
          Hoe mogen we je aanspreken?
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="local-display-name" className="sr-only">
            Voornaam
          </label>
          <input
            id="local-display-name"
            type="text"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white text-gray-900 text-base"
            placeholder="Voornaam"
            disabled={busy}
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm transition-colors disabled:opacity-50"
          >
            Begin mijn eerste dag
          </button>
        </form>
      </div>
    </div>
  );
}
