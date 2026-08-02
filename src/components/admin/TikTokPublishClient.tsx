"use client";

import { useEffect, useMemo, useState } from "react";

type Creator = {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
};

type SessionResponse = {
  configured: boolean;
  connected: boolean;
  creator?: Creator;
  error?: string;
  message?: string;
};

function defaultDemoImages(): string[] {
  // Publieke JPEG op structuro.ai (domain ownership moet in TikTok portal geverifieerd zijn).
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.structuro.ai";
    return [`${origin}/jasper/niels.jpg`];
  } catch {
    return ["https://www.structuro.ai/jasper/niels.jpg"];
  }
}

export function TikTokPublishClient({
  initialError,
  justConnected,
}: {
  initialError?: string | null;
  justConnected?: boolean;
}) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Structuro demo");
  const [description, setDescription] = useState(
    "Audit demo: photo carousel via Content Posting API."
  );
  const [imageUrlsText, setImageUrlsText] = useState(() =>
    defaultDemoImages().join("\n")
  );
  const [privacyLevel, setPrivacyLevel] = useState("SELF_ONLY");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const imageUrls = useMemo(
    () =>
      imageUrlsText
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean),
    [imageUrlsText]
  );

  async function loadSession() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tiktok/session", {
        credentials: "include",
      });
      const json = (await res.json()) as SessionResponse;
      setSession(json);
      if (json.creator?.privacy_level_options?.length) {
        const preferred = json.creator.privacy_level_options.includes(
          "SELF_ONLY"
        )
          ? "SELF_ONLY"
          : json.creator.privacy_level_options[0];
        setPrivacyLevel(preferred);
      }
      if (json.error) {
        setError(json.message || json.error);
      }
    } catch {
      setError("Kon sessie niet laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  async function disconnect() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      await fetch("/api/admin/tiktok/disconnect", {
        method: "POST",
        credentials: "include",
      });
      await loadSession();
    } catch {
      setError("Disconnect mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/tiktok/publish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          photoImages: imageUrls,
          photoCoverIndex: 0,
          privacyLevel,
          autoAddMusic: true,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        publish_id?: string;
        error?: string;
        message?: string;
        privacy_level?: string;
      };
      if (!res.ok || !json.ok) {
        setError(
          [json.error, json.message].filter(Boolean).join(": ") ||
            "Publish mislukt."
        );
        return;
      }
      setResult(
        `Gepubliceerd. publish_id=${json.publish_id} · privacy=${json.privacy_level}`
      );
    } catch {
      setError("Publish request mislukt.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Laden…</p>;
  }

  if (!session?.configured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">TikTok env nog niet gezet</p>
        <p className="mt-1">
          Zet <code className="text-xs">TIKTOK_CLIENT_KEY</code> en{" "}
          <code className="text-xs">TIKTOK_CLIENT_SECRET</code> op Vercel
          (Production). Redirect URI:{" "}
          <code className="break-all text-xs">
            https://www.structuro.ai/api/admin/tiktok/oauth/callback
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {justConnected ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          TikTok-account gekoppeld.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {result}
        </p>
      ) : null}

      {!session.connected || !session.creator ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Koppel een TikTok-account (sandbox/test) voor de audit-demo. Alleen
            bereikbaar met de activity-admin code.
          </p>
          <a
            href="/api/admin/tiktok/oauth/start"
            className="mt-4 inline-flex rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white"
          >
            Connect TikTok
          </a>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            {session.creator.creator_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.creator.creator_avatar_url}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-500">
                TT
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800">
                @{session.creator.creator_username}
              </p>
              <p className="truncate text-sm text-slate-500">
                {session.creator.creator_nickname}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void disconnect()}
              disabled={busy}
              className="text-sm text-slate-600 underline disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Titel</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={90}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Beschrijving</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">
                Foto-URLs (https, JPEG/WEBP, één per regel)
              </span>
              <textarea
                value={imageUrlsText}
                onChange={(e) => setImageUrlsText(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Domain ownership van structuro.ai moet in het TikTok-portal
                geverifieerd zijn voor PULL_FROM_URL.
              </span>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Privacy</span>
              <select
                value={privacyLevel}
                onChange={(e) => setPrivacyLevel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {session.creator.privacy_level_options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Voor unaudited apps: meestal SELF_ONLY.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy || imageUrls.length === 0}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Bezig…" : "Publish photo carousel"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
