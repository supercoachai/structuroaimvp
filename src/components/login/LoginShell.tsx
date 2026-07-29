"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import V2LanguageToggle from "@/components/v2/V2LanguageToggle";

type LoginShellProps = {
  children: ReactNode;
  error?: string | null;
  info?: string | null;
};

function LoginPhonePreview({
  eyebrow,
  greeting,
  energy,
  turn,
  count,
  taskTitle,
  microOpen,
  microDone,
  focusCta,
  otherTask,
  loopLabel,
  dump,
  shutdown,
  reassure,
}: {
  eyebrow: string;
  greeting: string;
  energy: string;
  turn: string;
  count: string;
  taskTitle: string;
  microOpen: string;
  microDone: string;
  focusCta: string;
  otherTask: string;
  loopLabel: string;
  dump: string;
  shutdown: string;
  reassure: string;
}) {
  return (
    <div className="login-shell__phone" aria-hidden="true">
      <span className="login-shell__iphone-side login-shell__iphone-side--action" />
      <span className="login-shell__iphone-side login-shell__iphone-side--volup" />
      <span className="login-shell__iphone-side login-shell__iphone-side--voldown" />
      <span className="login-shell__iphone-side login-shell__iphone-side--power" />
      <span className="login-shell__iphone-side login-shell__iphone-side--camctl" />
      <div className="login-shell__iphone-island">
        <span className="login-shell__iphone-island-cam" />
      </div>
      <div className="login-shell__phone-screen login-shell__phone-screen--home">
        <div className="login-shell__home-top">
          <p className="login-shell__home-eyebrow">{eyebrow}</p>
          <div className="login-shell__home-head">
            <p className="login-shell__home-greeting">{greeting}</p>
            <span className="login-shell__home-chip">{energy}</span>
          </div>
        </div>
        <div className="login-shell__home-card">
          <div className="login-shell__home-card-meta">
            <span>{turn}</span>
            <span className="login-shell__home-card-count">{count}</span>
          </div>
          <p className="login-shell__home-card-title">{taskTitle}</p>
          <ul className="login-shell__home-micro">
            <li>
              <span className="login-shell__home-micro-chk" />
              <span>{microOpen}</span>
            </li>
            <li>
              <span className="login-shell__home-micro-chk login-shell__home-micro-chk--done">
                ✓
              </span>
              <span className="login-shell__home-micro-done">{microDone}</span>
            </li>
          </ul>
          <div className="login-shell__home-focus">{focusCta}</div>
          <div className="login-shell__home-other">{otherTask}</div>
          <div className="login-shell__home-loop">
            <p className="login-shell__home-loop-label">{loopLabel}</p>
            <p className="login-shell__home-loop-links">
              <span>{dump}</span>
              <span aria-hidden="true"> · </span>
              <span>{shutdown}</span>
            </p>
          </div>
        </div>
        <p className="login-shell__home-reassure">{reassure}</p>
      </div>
    </div>
  );
}

export function LoginShell({ children, error, info }: LoginShellProps) {
  const { t } = useI18n();
  const [logoError, setLogoError] = useState(false);

  function handleBack() {
    window.location.href = "https://www.structuro.eu";
  }

  return (
    <div className="login-shell">
      <button
        type="button"
        onClick={handleBack}
        className="login-shell__back"
      >
        ← {t("registrerenPage.backLink")}
      </button>

      <div className="login-shell__lang">
        <V2LanguageToggle />
      </div>

      <aside className="login-shell__visual">
        <div className="login-shell__visual-inner">
          <div className="login-shell__brand">
            {logoError ? (
              <div className="login-shell__logo-fallback" aria-hidden>
                S
              </div>
            ) : (
              <img
                src="/logo-structuro.png"
                alt=""
                width={56}
                height={56}
                className="login-shell__logo"
                onError={() => setLogoError(true)}
              />
            )}
            <p className="login-shell__tagline">{t("login.visualTagline")}</p>
          </div>

          <LoginPhonePreview
            eyebrow={t("login.visualEyebrow")}
            greeting={t("login.visualGreeting")}
            energy={t("login.visualEnergy")}
            turn={t("login.visualTurn")}
            count={t("login.visualCount")}
            taskTitle={t("login.visualTask1")}
            microOpen={t("login.visualMicro1")}
            microDone={t("login.visualMicro2")}
            focusCta={t("login.visualFocusCta")}
            otherTask={t("login.visualOther")}
            loopLabel={t("login.visualLoop")}
            dump={t("login.visualDump")}
            shutdown={t("login.visualShutdown")}
            reassure={t("login.visualReassure")}
          />
        </div>
      </aside>

      <main className="login-shell__form">
        <div className="login-shell__form-inner">
          <div className="login-shell__mobile-brand">
            {logoError ? (
              <div className="login-shell__logo-fallback login-shell__logo-fallback--sm" aria-hidden>
                S
              </div>
            ) : (
              <img
                src="/logo-structuro.png"
                alt=""
                width={44}
                height={44}
                className="login-shell__logo login-shell__logo--sm"
                onError={() => setLogoError(true)}
              />
            )}
          </div>

          {info ? (
            <p className="login-shell__banner login-shell__banner--info">{info}</p>
          ) : null}
          {error ? (
            <p className="login-shell__banner login-shell__banner--error" role="alert">
              {error}
            </p>
          ) : null}

          {children}
        </div>
      </main>
    </div>
  );
}
