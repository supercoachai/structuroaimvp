"use client";

import { useState } from "react";
import { joinWaitlist, type JoinWaitlistResult } from "./actions";
import { useI18n } from "@/lib/i18n";
import { captureMarketingEvent } from "@/lib/posthog/track";

/** Marketing site (landing); los van de Next-app waar je wordt ingelogd. */
const STRUCTURO_EU_ORIGIN = "https://www.structuro.eu";

type Phase = "form" | "success" | "already_exists" | "error";

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-left text-[15px] leading-snug text-slate-700">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#059669"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="pt-px text-balance">{children}</span>
    </li>
  );
}

export default function WaitlistClient({ initialSource }: { initialSource: string }) {
  const { t, locale, setLocale } = useI18n();
  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameErr(null);
    setEmailErr(null);

    let nameOk = true;
    let emailOk = true;
    const nameTrimmed = nameInput.trim();
    const emailTrimmed = emailInput.trim();
    if (!nameTrimmed) {
      setNameErr(t("waitlist.validationName"));
      nameOk = false;
    }
    if (!emailTrimmed) {
      setEmailErr(t("waitlist.validationEmail"));
      emailOk = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed.toLowerCase())) {
      setEmailErr(t("waitlist.validationEmail"));
      emailOk = false;
    }
    if (!nameOk || !emailOk) return;

    const fd = new FormData(e.currentTarget);
    fd.set("name", nameTrimmed);
    fd.set("email", emailTrimmed.toLowerCase());
    fd.set("source", initialSource);

    captureMarketingEvent("waitlist_signup_started", { source: initialSource, site: "ai" });

    setBusy(true);
    let result: JoinWaitlistResult;
    try {
      result = await joinWaitlist(fd);
    } finally {
      setBusy(false);
    }

    if (result.ok === true) {
      setFirstName(result.firstName);
      setPhase("success");
      return;
    }

    if (result.type === "already_exists") {
      setPhase("already_exists");
      return;
    }
    if (result.type === "validation") {
      if (result.message === "name_required") setNameErr(t("waitlist.validationName"));
      if (result.message === "email_invalid") setEmailErr(t("waitlist.validationEmail"));
      return;
    }
    setPhase("error");
  }

  function resetTryAgain() {
    setPhase("form");
    setEmailInput("");
    setEmailErr(null);
    setNameErr(null);
  }

  return (
    <div className="relative isolate flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[var(--st-bg)] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {/* Decor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-10%] h-[520px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(37,99,235,0.18),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-[22%] h-72 w-72 rounded-full bg-blue-400/30 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-[8%] h-96 w-96 rounded-full bg-violet-400/25 blur-[110px]"
      />

      {/* Header */}
      <header className="relative z-10 flex items-start justify-between gap-4 px-4 pb-6 sm:px-8">
        <a
          href={`${STRUCTURO_EU_ORIGIN}/`}
          className="inline-flex shrink-0 items-center gap-3 rounded-xl no-underline ring-slate-200/80 transition hover:ring-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label="Structuro"
        >
          {logoOk ? (
            <img
              src="/logo-structuro.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 object-contain drop-shadow-sm"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-md">
              S
            </span>
          )}
          <span className="hidden font-semibold tracking-tight text-slate-800 sm:inline">
            Structuro
          </span>
        </a>
        <div
          className="flex shrink-0 gap-1 rounded-xl border border-slate-200/90 bg-white/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm"
          role="group"
          aria-label={t("settings.languageTitle")}
        >
          <button
            type="button"
            onClick={() => setLocale("nl")}
            className={`rounded-lg px-2.5 py-1.5 ${locale === "nl" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
          >
            NL
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`rounded-lg px-2.5 py-1.5 ${locale === "en" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
          >
            EN
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-[1] mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 pb-14 sm:px-8 lg:grid lg:grid-cols-[1fr,minmax(0,440px)] lg:items-start lg:gap-16 xl:gap-24">
        <section className="mx-auto flex max-w-xl flex-col text-center lg:mx-0 lg:max-w-none lg:text-left">
          <span className="mb-5 inline-flex w-fit items-center justify-center self-center rounded-full border border-blue-100 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700 shadow-sm lg:self-start">
            {t("waitlist.eyebrow")}
          </span>
          <h1 className="text-[2rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-slate-900 sm:text-5xl xl:text-[3.35rem]">
            <span className="block text-balance sm:inline">
              {t("waitlist.titleWord")}
            </span>
            <span className="mt-1 block bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent sm:mt-0 sm:inline">
              {t("waitlist.titleAccent")}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[17px] font-light leading-relaxed text-slate-600 text-balance sm:text-lg lg:mx-0 lg:max-w-lg">
            {t("waitlist.subtitle")}
          </p>
          <ul className="mx-auto mt-10 max-w-md space-y-4 lg:mx-0 lg:max-w-lg">
            <Bullet>{t("waitlist.point1")}</Bullet>
            <Bullet>{t("waitlist.point2")}</Bullet>
            <Bullet>{t("waitlist.point3")}</Bullet>
          </ul>
          <nav className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 lg:justify-start">
            <a href={`${STRUCTURO_EU_ORIGIN}/`} className="font-medium text-blue-600 hover:text-blue-800">
              {t("waitlist.backToSite")}
            </a>
            <span aria-hidden className="hidden text-slate-300 sm:inline">
              ·
            </span>
            <a
              href={`${STRUCTURO_EU_ORIGIN}/privacy/`}
              className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-800"
            >
              {t("waitlist.footerPrivacy")}
            </a>
          </nav>
        </section>

        <section className="mx-auto flex w-full max-w-md flex-col lg:sticky lg:top-28 lg:mx-0 lg:max-w-none">
          {phase === "form" ? (
            <div className="relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-white/95 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/60 backdrop-blur-sm">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-70" aria-hidden />
              <div className="p-8 sm:p-9">
                <p className="mb-7 text-center text-[15px] leading-snug text-slate-600 text-balance">
                  {t("waitlist.cardLead")}
                </p>
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
                  <input type="hidden" name="source" value={initialSource} readOnly />
                  <div className="space-y-2">
                    <label htmlFor="wl-name" className="block text-sm font-medium text-slate-600">
                      {t("waitlist.fnLabel")}
                    </label>
                    <input
                      id="wl-name"
                      name="name"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={nameInput}
                      disabled={busy}
                      placeholder="…"
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-slate-900 shadow-inner shadow-slate-900/5 outline-none ring-0 transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60"
                    />
                    {nameErr ? <p className="text-xs font-medium text-red-600">{nameErr}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="wl-email" className="block text-sm font-medium text-slate-600">
                      {t("waitlist.emailLabel")}
                    </label>
                    <input
                      id="wl-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={emailInput}
                      disabled={busy}
                      placeholder="naam@voorbeeld.nl"
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60"
                    />
                    {emailErr ? <p className="text-xs font-medium text-red-600">{emailErr}</p> : null}
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/35 transition hover:shadow-xl hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
                  >
                    <span className="relative z-[1]">
                      {busy ? t("waitlist.submitting") : t("waitlist.submit")}
                    </span>
                  </button>
                  <p className="text-center text-xs leading-relaxed text-slate-400 text-pretty">
                    {t("waitlist.disclaimer")}
                  </p>
                </form>
              </div>
            </div>
          ) : null}

          {phase === "success" ? (
            <div className="relative overflow-hidden rounded-[1.65rem] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-9 text-center shadow-[0_24px_50px_-24px_rgba(5,150,105,0.35)] ring-1 ring-emerald-100/80">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-4xl leading-none text-emerald-600"
                aria-hidden
              >
                ✓
              </div>
              <p className="text-lg font-bold tracking-tight text-slate-900">
                {t("waitlist.successTitle").replace("{name}", firstName)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 text-balance">
                {t("waitlist.successLine")}
              </p>
            </div>
          ) : null}

          {phase === "already_exists" ? (
            <div className="rounded-[1.65rem] border border-slate-200 bg-white px-9 py-10 text-center shadow-lg shadow-slate-900/10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl" aria-hidden>
                ✉️
              </div>
              <p className="text-sm leading-relaxed text-slate-700 text-balance">
                {t("waitlist.alreadyExists")}
              </p>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="rounded-[1.65rem] border border-red-100 bg-white px-9 py-10 text-center shadow-lg shadow-red-900/10">
              <p className="text-sm font-medium leading-relaxed text-red-800 text-balance">
                {t("waitlist.errorGeneric")}
              </p>
              <button
                type="button"
                onClick={() => resetTryAgain()}
                className="mt-7 rounded-xl border border-slate-200 bg-slate-50 px-6 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                {t("waitlist.tryAgain")}
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
