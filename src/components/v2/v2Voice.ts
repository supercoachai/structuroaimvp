"use client";

/** Web Speech API wrapper: continuous mic, silence auto-stop, graceful fallback. */

import {
  nextSilenceCheckDelayMs,
  shouldAutoStopOnSilence,
  speechLangForLocale,
  V2_SPEECH_SILENCE_AFTER_MS,
  V2_SPEECH_SILENCE_BEFORE_MS,
} from "./v2SpeechSilence";

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

type SpeechRecognitionResultLike = {
  isFinal?: boolean;
  0?: { transcript: string };
  length: number;
};

type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: {
    [index: number]: SpeechRecognitionResultLike;
    length: number;
  };
};

export type V2SpeechErrorKind =
  | "nothing-heard"
  | "speech-stopped"
  | "recognition-failed"
  | "mic-failed";

export type V2SpeechMessages = {
  nothingHeard: string;
  speechStopped: string;
  recognitionFailed: string;
  micFailed: string;
};

export type V2SpeechSessionOptions = {
  locale?: string;
  silenceAfterSpeechMs?: number;
  silenceBeforeSpeechMs?: number;
  messages?: Partial<V2SpeechMessages>;
  /** Live transcript (finals + current interim) for coaching UI. */
  onPartial?: (text: string) => void;
  /** Fired when session is about to flush (manual stop or silence). */
  onWillFlush?: () => void;
};

const DEFAULT_MESSAGES: V2SpeechMessages = {
  nothingHeard: "Niets gehoord. Typ kort wat je zei.",
  speechStopped: "Spraak gestopt. Typ kort wat je zei.",
  recognitionFailed: "Spraakherkenning lukte niet. Typ kort wat je zei.",
  micFailed: "Microfoon kon niet starten. Typ kort wat je zei.",
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

export type V2SpeechSession = {
  start: () => void;
  stop: () => void;
};

/**
 * Continuous session with silence auto-stop.
 * Accumulates transcripts across pauses; flushes once on stop or quiet timeout.
 */
export function createV2SpeechSession(
  onFinal: (text: string) => void,
  onError: (message: string, kind: V2SpeechErrorKind) => void,
  options: V2SpeechSessionOptions = {},
): V2SpeechSession | null {
  const Ctor = getSpeechRecognition();
  if (!Ctor) return null;

  const messages: V2SpeechMessages = { ...DEFAULT_MESSAGES, ...options.messages };
  const silenceAfter = options.silenceAfterSpeechMs ?? V2_SPEECH_SILENCE_AFTER_MS;
  const silenceBefore = options.silenceBeforeSpeechMs ?? V2_SPEECH_SILENCE_BEFORE_MS;

  const rec = new Ctor();
  rec.lang = speechLangForLocale(options.locale ?? "nl");
  rec.continuous = true;
  rec.interimResults = true;

  let intentionalStop = false;
  let finished = false;
  let started = false;
  let willFlushNotified = false;
  let startedAt = 0;
  let lastSpeechAt: number | null = null;
  const finalChunks: string[] = [];
  let interim = "";
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;

  const clearSilenceTimer = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const emitPartial = () => {
    const text = [...finalChunks, interim].join(" ").replace(/\s+/g, " ").trim();
    options.onPartial?.(text);
  };

  const notifyWillFlush = () => {
    if (willFlushNotified) return;
    willFlushNotified = true;
    options.onWillFlush?.();
  };

  const finishOnce = (fn: () => void) => {
    if (finished) return;
    finished = true;
    clearSilenceTimer();
    fn();
  };

  const combinedTranscript = () =>
    [...finalChunks, interim].join(" ").replace(/\s+/g, " ").trim();

  const flushTranscript = () => {
    notifyWillFlush();
    const text = combinedTranscript();
    interim = "";
    if (text.length > 0) {
      finishOnce(() => onFinal(text));
      return;
    }
    finishOnce(() =>
      onError(
        intentionalStop ? messages.nothingHeard : messages.speechStopped,
        intentionalStop ? "nothing-heard" : "speech-stopped",
      ),
    );
  };

  const requestStop = () => {
    if (finished) return;
    intentionalStop = true;
    clearSilenceTimer();
    notifyWillFlush();
    try {
      rec.stop();
    } catch {
      flushTranscript();
    }
  };

  const scheduleSilenceCheck = () => {
    clearSilenceTimer();
    if (finished || intentionalStop || !started) return;
    const now = Date.now();
    const delay = nextSilenceCheckDelayMs({
      now,
      startedAt,
      lastSpeechAt,
      silenceAfterSpeechMs: silenceAfter,
      silenceBeforeSpeechMs: silenceBefore,
    });
    silenceTimer = setTimeout(() => {
      if (finished || intentionalStop) return;
      const due = shouldAutoStopOnSilence({
        now: Date.now(),
        startedAt,
        lastSpeechAt,
        silenceAfterSpeechMs: silenceAfter,
        silenceBeforeSpeechMs: silenceBefore,
      });
      if (due) {
        requestStop();
        return;
      }
      scheduleSilenceCheck();
    }, Math.max(delay, 50));
  };

  const noteSpeech = () => {
    lastSpeechAt = Date.now();
    scheduleSilenceCheck();
  };

  rec.onresult = (ev) => {
    const startIdx = typeof ev.resultIndex === "number" ? ev.resultIndex : 0;
    let sawSpeech = false;
    let nextInterim = "";
    for (let i = startIdx; i < ev.results.length; i += 1) {
      const result = ev.results[i];
      const piece = result[0]?.transcript?.trim() ?? "";
      if (piece.length === 0) continue;
      sawSpeech = true;
      if (result.isFinal === false) {
        nextInterim = piece;
      } else {
        finalChunks.push(piece);
        nextInterim = "";
      }
    }
    // Full interim rebuild from last non-final if browser rewrites earlier slots
    if (sawSpeech) {
      // Prefer latest interim across all results when present
      let latestInterim = nextInterim;
      for (let i = 0; i < ev.results.length; i += 1) {
        const result = ev.results[i];
        if (result.isFinal === false) {
          latestInterim = result[0]?.transcript?.trim() ?? latestInterim;
        }
      }
      interim = latestInterim;
      noteSpeech();
      emitPartial();
    }
  };

  rec.onerror = (ev) => {
    if (ev.error === "aborted") return;
    if (!intentionalStop && (ev.error === "no-speech" || ev.error === "network")) {
      // Quiet gap or blip: silence timer / onend restart handle it.
      return;
    }
    clearSilenceTimer();
    finishOnce(() => onError(messages.recognitionFailed, "recognition-failed"));
  };

  rec.onend = () => {
    if (finished) return;
    if (intentionalStop) {
      flushTranscript();
      return;
    }
    // Chrome often ends after a pause; restart until silence auto-stop or manual stop.
    if (started) {
      try {
        rec.start();
        scheduleSilenceCheck();
        return;
      } catch {
        flushTranscript();
        return;
      }
    }
    flushTranscript();
  };

  return {
    start: () => {
      intentionalStop = false;
      finished = false;
      willFlushNotified = false;
      started = true;
      startedAt = Date.now();
      lastSpeechAt = null;
      finalChunks.length = 0;
      interim = "";
      try {
        rec.start();
        scheduleSilenceCheck();
      } catch {
        finishOnce(() => onError(messages.micFailed, "mic-failed"));
      }
    },
    stop: () => {
      requestStop();
    },
  };
}
