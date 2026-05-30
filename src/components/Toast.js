import React, { useEffect, useState } from "react";

/** Moet gelijk lopen met `--st-toast-motion-ms` in globals.css */
const TOAST_EXIT_MS = 900;

let push;
export function useToast() {
  const [q, setQ] = useState([]);

  const removeAfterFade = (id) => {
    setTimeout(() => {
      setQ((s) => s.filter((x) => x.id !== id));
    }, TOAST_EXIT_MS);
  };

  push = (msg, opts = {}) => {
    const { durationMs = 3000, replace = false, tone = "neutral" } = opts || {};
    const id = Math.random();
    setQ((s) =>
      replace
        ? [{ id, msg, durationMs, fading: false, tone }]
        : [...s, { id, msg, durationMs, fading: false, tone }]
    );
    if (typeof durationMs === "number" && durationMs > 0) {
      const fadeAt = Math.max(0, durationMs - TOAST_EXIT_MS);
      setTimeout(() => {
        setQ((s) => s.map((x) => (x.id === id ? { ...x, fading: true } : x)));
      }, fadeAt);
      setTimeout(() => {
        setQ((s) => s.filter((x) => x.id !== id));
      }, fadeAt + TOAST_EXIT_MS);
    }
  };

  const dismiss = (id) => {
    setQ((s) => {
      const item = s.find((x) => x.id === id);
      if (!item || item.fading) return s;
      return s.map((x) => (x.id === id ? { ...x, fading: true } : x));
    });
    removeAfterFade(id);
  };

  return { q, dismiss };
}

function toastToneClass(tone) {
  if (tone === "error") return "st-toast--error";
  if (tone === "success") return "st-toast--success";
  return "";
}

export function ToastHost() {
  const { q, dismiss } = useToast();
  useEffect(() => {
    /* singleton hook anchor */
  }, []);

  if (!q.length) return null;

  return (
    <div className="st-toast-host" aria-live="polite">
      {q.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`st-toast ${toastToneClass(t.tone)}${t.fading ? " is-fading" : ""}`}
          onClick={() => dismiss(t.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              dismiss(t.id);
            }
          }}
          tabIndex={0}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export const toast = (m, opts) => push?.(m, opts);
toast.error = (m, opts) => push?.(m, { ...opts, tone: "error" });
toast.success = (m, opts) => push?.(m, { ...opts, tone: "success" });
