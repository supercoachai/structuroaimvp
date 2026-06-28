"use client";

import { Suspense, useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  enterAnonymousOnboarding,
  shouldResetAnonymousOnboardingFromClient,
} from "@/lib/auth/anonymousOnboardingEntry";
import {
  JASPER_LANDING_PATH,
  JASPER_SIGNUP_CAMPAIGN,
  JASPER_SIGNUP_SOURCE,
  getJasperOffer,
} from "@/lib/jasper/jasperOffer";
import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";
import {
  CAMPAIGN_KEY,
  SOURCE_KEY,
  applySignupAttributionFromSearchParams,
  markJasperAttributionPersistent,
} from "@/lib/posthog/signupAttribution";
import { trackAcquisitionCtaClicked } from "@/lib/posthog/acquisitionAnalyticsClient";

type JasperLandingClientProps = {
  /** Query-string snapshot; gebruikt als React-key zodat re-render bij utm-change. */
  queryKey: string;
};

const COLOR_BODY = "#E8E4DA";
const COLOR_CREAM = "#FDFBF4";
const COLOR_TEXT = "#1A1A1B";
const COLOR_TEAL = "#2D5A56";
const COLOR_ON_DARK = "#F5F2EA";
const COLOR_TEXT_SOFT = "rgba(26,26,27,0.50)";
const COLOR_TEXT_FAINT = "rgba(26,26,27,0.28)";

const FONT_SERIF = "var(--font-newsreader), Georgia, serif";

const CARD_STYLE = {
  backgroundColor: COLOR_CREAM,
  borderRadius: 32,
  boxShadow:
    "0 0 0 1px rgba(0,0,0,0.07), 0 8px 80px rgba(0,0,0,0.16)",
} as const;

type HeroLineVariant = "active" | "soft" | "accent";

const HERO_LINES: ReadonlyArray<{ text: string; variant: HeroLineVariant }> = [
  {
    text: "Je herkende wat we bespraken in de podcast van Jasper.",
    variant: "active",
  },
  { text: "Dat gevoel dat planning niet werkt.", variant: "soft" },
  { text: "Dat je het probeert, maar het hapt niet.", variant: "soft" },
  { text: "Structuro is daarvoor gemaakt.", variant: "active" },
  { text: "Probeer het rustig.", variant: "accent" },
];

function heroLineColor(variant: HeroLineVariant): string {
  if (variant === "soft") return COLOR_TEXT_SOFT;
  if (variant === "accent") return COLOR_TEAL;
  return COLOR_TEXT;
}

/**
 * Borg dat een bezoek aan /jasper zonder utm in elk geval signup_source=
 * jasper_podcast in sessionStorage zet. URL-params winnen nog steeds: als er
 * al iets staat raken we het niet aan.
 */
function persistJasperAttributionFallback() {
  if (typeof window === "undefined") return;
  try {
    if (!sessionStorage.getItem(SOURCE_KEY)) {
      sessionStorage.setItem(SOURCE_KEY, JASPER_SIGNUP_SOURCE);
    }
    if (!sessionStorage.getItem(CAMPAIGN_KEY)) {
      sessionStorage.setItem(CAMPAIGN_KEY, JASPER_SIGNUP_CAMPAIGN);
    }
    markJasperAttributionPersistent();
  } catch {
    /* private mode of quota: best-effort */
  }
}

function formatTrialDuration(trialDays: number): string {
  if (trialDays === 1) return "1 dag gratis";
  return `${trialDays} dagen gratis`;
}

function JasperNav({ className }: { className: string }) {
  return (
    <nav className={className}>
      <div className="flex items-center gap-2">
        <Image
          src="/logo-structuro.png"
          alt="Structuro"
          width={24}
          height={24}
          priority
          className="h-6 w-6 rounded-full object-cover"
        />
        <span
          className="text-[16px] font-bold"
          style={{ letterSpacing: "-0.02em", color: COLOR_TEXT }}
        >
          Structuro
        </span>
      </div>
      <span
        className="text-[11px] font-semibold uppercase"
        style={{ letterSpacing: "0.12em", color: COLOR_TEAL }}
      >
        Via Jasper
      </span>
    </nav>
  );
}

function JasperHeroCopy({
  fontSize,
  className,
  offerLine,
}: {
  fontSize: number;
  className: string;
  offerLine?: string;
}) {
  return (
    <section className={className}>
      {HERO_LINES.map((line) => (
        <p
          key={line.text}
          style={{
            fontFamily: FONT_SERIF,
            fontSize,
            lineHeight: 1.22,
            letterSpacing: "-0.018em",
            fontWeight: 400,
            fontStyle: line.variant === "accent" ? "italic" : "normal",
            color: heroLineColor(line.variant),
          }}
        >
          {line.text}
        </p>
      ))}
      {offerLine ? (
        <p
          className="mt-[18px] text-[14px] font-semibold"
          style={{ color: COLOR_TEAL, letterSpacing: "-0.01em" }}
        >
          {offerLine}
        </p>
      ) : null}
    </section>
  );
}

function JasperCtaBlock({
  offerLine,
  ctaLabel,
  onCtaClick,
  className,
  trustAlign = "center",
}: {
  offerLine?: string;
  ctaLabel: string;
  onCtaClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  className: string;
  trustAlign?: "center" | "left";
}) {
  return (
    <div className={className}>
      {offerLine ? (
        <p
          className="text-[14px] font-semibold"
          style={{ color: COLOR_TEAL, letterSpacing: "-0.01em" }}
        >
          {offerLine}
        </p>
      ) : null}
      <Link
        href="/onboarding"
        onClick={onCtaClick}
        className={`flex w-full items-center justify-center transition-opacity hover:opacity-90 ${offerLine ? "mt-5" : ""}`}
        style={{
          backgroundColor: COLOR_TEAL,
          color: COLOR_ON_DARK,
          borderRadius: 14,
          padding: "17px 24px",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          textDecoration: "none",
        }}
      >
        {ctaLabel}
      </Link>
      <p
        className={`mt-[10px] text-[12px] font-medium ${trustAlign === "center" ? "text-center" : "text-left"}`}
        style={{ color: COLOR_TEXT_FAINT, letterSpacing: "0.01em" }}
      >
        Altijd opzegbaar
      </p>
    </div>
  );
}

function JasperFounderPhoto({
  containerClassName,
  imageSizes,
  imageHeight,
}: {
  containerClassName: string;
  imageSizes: string;
  imageHeight?: number;
}) {
  const image = (
    <Image
      src="/jasper/niels.jpg"
      alt="Niels, founder van Structuro"
      fill
      priority
      sizes={imageSizes}
      style={{ objectFit: "cover", objectPosition: "center 22%" }}
    />
  );

  return (
    <div className={containerClassName}>
      {imageHeight != null ? (
        <div className="relative w-full" style={{ height: imageHeight }}>
          {image}
        </div>
      ) : (
        image
      )}
      <div
        className="absolute inset-x-0 bottom-0 px-6 pt-12"
        style={{
          paddingBottom: 22,
          background:
            "linear-gradient(to top, rgba(253,251,244,0.96) 0%, rgba(253,251,244,0) 100%)",
        }}
      >
        <div
          className="text-[15px] font-bold"
          style={{ letterSpacing: "-0.01em", color: COLOR_TEXT }}
        >
          Niels
        </div>
        <div
          className="mt-0.5 text-[13px]"
          style={{ color: COLOR_TEXT_SOFT }}
        >
          Founder van Structuro
        </div>
      </div>
    </div>
  );
}

function JasperLandingInner({ queryKey }: JasperLandingClientProps) {
  const searchParams = useSearchParams();
  void queryKey;
  const [hasAuthHint, setHasAuthHint] = useState(false);
  const offer = getJasperOffer();
  const trialLabel = formatTrialDuration(offer.trialDays);
  const offerLine = `${trialLabel} · daarna ${offer.discountedPrice}/m voor Jasper-luisteraars`;

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
    persistJasperAttributionFallback();
  }, [searchParams]);

  useEffect(() => {
    setHasAuthHint(hasSupabaseAuthHintOnClient());
  }, []);

  function handleCtaClick(event: MouseEvent<HTMLAnchorElement>) {
    trackAcquisitionCtaClicked({
      channel: "organic",
      pathname: JASPER_LANDING_PATH,
      searchParams,
      variant: {
        campaign: { id: "jasper" },
        hero: { id: "jasper" },
        heroSource: "campaign-default",
      },
    });

    applySignupAttributionFromSearchParams(searchParams);
    persistJasperAttributionFallback();

    if (hasSupabaseAuthHintOnClient()) {
      // Ingelogde bezoeker: laat de middleware (op /onboarding) de juiste
      // vervolgroute bepalen. Geen reset van de anonieme onboarding-state.
      return;
    }

    event.preventDefault();

    const reset = shouldResetAnonymousOnboardingFromClient();
    enterAnonymousOnboarding(reset ? { reset: true } : undefined);
    window.location.assign("/onboarding");
  }

  const ctaLabel = hasAuthHint ? "Open Structuro" : "Start gratis";

  return (
    <div
      className="antialiased"
      style={{ backgroundColor: COLOR_BODY, color: COLOR_TEXT }}
    >
      {/* Mobile: ongewijzigde mockup-layout (< md) */}
      <div className="flex min-h-[100dvh] w-full justify-center px-2 pb-20 pt-12 md:hidden">
        <article
          className="w-full max-w-[390px] overflow-hidden"
          style={CARD_STYLE}
        >
          <JasperNav className="flex items-center justify-between px-6 pt-[22px]" />

          <JasperHeroCopy
            fontSize={27}
            className="flex flex-col gap-1 px-6 pt-7"
            offerLine={offerLine}
          />

          <JasperCtaBlock
            ctaLabel={ctaLabel}
            onCtaClick={handleCtaClick}
            className="px-6 pt-5"
          />

          <JasperFounderPhoto
            containerClassName="relative mt-[30px] w-full overflow-hidden"
            imageSizes="(max-width: 767px) 100vw, 390px"
            imageHeight={370}
          />
        </article>
      </div>

      {/* Desktop: twee kolommen, content links + foto rechts (md+) */}
      <div className="hidden min-h-[100dvh] w-full items-center justify-center px-6 py-12 md:flex lg:px-10 lg:py-16">
        <article
          className="grid w-full max-w-5xl overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:grid-cols-[minmax(0,1fr)_420px]"
          style={CARD_STYLE}
        >
          <JasperFounderPhoto
            containerClassName="relative row-span-2 row-start-1 min-h-[520px] overflow-hidden md:col-start-2 lg:min-h-[560px]"
            imageSizes="(max-width: 1024px) 400px, 420px"
          />

          <JasperNav className="relative z-10 col-start-1 row-start-1 flex items-center justify-between px-10 pt-8 lg:px-12 lg:pt-10" />

          <div className="relative z-10 col-start-1 row-start-2 flex flex-col justify-center px-10 pb-10 pt-6 lg:px-12 lg:pb-12 lg:pt-8">
            <JasperHeroCopy
              fontSize={30}
              className="flex flex-col gap-1.5"
            />
            <JasperCtaBlock
              offerLine={offerLine}
              ctaLabel={ctaLabel}
              onCtaClick={handleCtaClick}
              className="mt-8"
              trustAlign="left"
            />
          </div>
        </article>
      </div>
    </div>
  );
}

function JasperLandingFallback() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center"
      style={{ backgroundColor: COLOR_BODY, color: COLOR_TEXT_SOFT }}
    >
      <p className="text-sm">Laden</p>
    </div>
  );
}

export default function JasperLandingClient(props: JasperLandingClientProps) {
  return (
    <Suspense fallback={<JasperLandingFallback />}>
      <JasperLandingInner key={props.queryKey} {...props} />
    </Suspense>
  );
}
