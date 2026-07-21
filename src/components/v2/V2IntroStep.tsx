"use client";

/**
 * Welkom/intro-stap: full-bleed cream, geen witte kaart, geen progress.
 * Tekst-wordmark bovenaan, display-kop, cream + navy CTA.
 */
export default function V2IntroStep({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="v2-intro v2-fade">
      <p className="v2-intro__brand">Structuro</p>
      <div className="v2-intro__main">
        <p className="v2-eyebrow">WELKOM</p>
        <h1 className="v2-intro__title">
          Jouw <em className="v2-it">focus</em> voor vandaag.
        </h1>
      </div>

      <div className="v2-intro__footer">
        <button type="button" className="btn-primary w-full" onClick={onBegin}>
          Begin
        </button>
        <p className="v2-intro__reassurance">Stoppen kan altijd.</p>
      </div>
    </div>
  );
}
