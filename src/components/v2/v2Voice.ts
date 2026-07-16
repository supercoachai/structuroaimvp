"use client";

/** Web Speech API wrapper met graceful fallback. */

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isV2SpeechAvailable(): boolean {
  return getSpeechRecognition() !== null;
}

export function createV2SpeechSession(
  onFinal: (text: string) => void,
  onError: (message: string) => void,
): { start: () => void; stop: () => void } | null {
  const Ctor = getSpeechRecognition();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = "nl-NL";
  rec.continuous = false;
  rec.interimResults = false;

  let stopped = false;
  let gotResult = false;

  rec.onresult = (ev) => {
    const parts: string[] = [];
    for (let i = 0; i < ev.results.length; i += 1) {
      parts.push(ev.results[i][0]?.transcript ?? "");
    }
    const text = parts.join(" ").trim();
    if (text.length > 0) {
      gotResult = true;
      onFinal(text);
    }
  };

  rec.onerror = (ev) => {
    if (ev.error === "aborted") return;
    onError("Spraakherkenning lukte niet. Typ kort wat je zei.");
  };

  rec.onend = () => {
    if (!stopped && !gotResult) onError("");
  };

  return {
    start: () => {
      stopped = false;
      try {
        rec.start();
      } catch {
        onError("Microfoon kon niet starten. Typ kort wat je zei.");
      }
    },
    stop: () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        // negeren
      }
    },
  };
}
