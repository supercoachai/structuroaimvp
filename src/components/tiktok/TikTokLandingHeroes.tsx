"use client";

import { useState } from "react";

import type { BridgeChannel } from "@/lib/acquisition/bridgePaths";
import {
  LP_RITUAL_STEPS,
  type LpHeroId,
} from "@/lib/tiktok/lpConfig";
import { getLpThemeTokens } from "@/lib/tiktok/lpTheme";

import {
  StoryEyebrow,
  TikTokEyebrow,
  TikTokHeadline,
  TikTokLandingShell,
  TikTokSubline,
  type TikTokHeroShellProps,
} from "./TikTokLandingShared";

type HeroProps = TikTokHeroShellProps & { heroId: LpHeroId };

const DEMO_ENERGY = ["Laag", "Midden", "Hoog"] as const;
type DemoEnergy = (typeof DEMO_ENERGY)[number];

const DEMO_TASKS: Record<DemoEnergy, string[]> = {
  Laag: ["Drink een glas water"],
  Midden: ["Mail terugsturen naar Sanne", "10 min opruimen"],
  Hoog: ["Offerte afmaken", "Sportschool", "Bel de tandarts"],
};

export function HeroLayoutA(props: HeroProps) {
  const { campaign, heroId, channel } = props;
  const theme = getLpThemeTokens(campaign, heroId, channel);

  return (
    <TikTokLandingShell
      {...props}
      mainPositionClass="justify-center pb-28 md:pb-32"
      mainClassName="items-center text-center"
    >
      {theme.isStory ? (
        <StoryEyebrow onNavy={theme.isDark}>
          Voor ADHD-breinen die niet beginnen
        </StoryEyebrow>
      ) : (
        <TikTokEyebrow campaign={campaign} heroId={heroId} channel={channel}>
          Voor ADHD-breinen
        </TikTokEyebrow>
      )}
      <TikTokHeadline campaign={campaign} heroId={heroId} channel={channel} centered>
        {campaign.headline}
      </TikTokHeadline>
      <TikTokSubline campaign={campaign} heroId={heroId} channel={channel} centered>
        {campaign.subline}
      </TikTokSubline>
    </TikTokLandingShell>
  );
}

export function HeroLayoutB(props: HeroProps) {
  const { campaign, heroId, channel } = props;
  const theme = getLpThemeTokens(campaign, heroId, channel);
  const [energy, setEnergy] = useState<DemoEnergy>("Midden");
  const tasks = DEMO_TASKS[energy];

  return (
    <TikTokLandingShell {...props}>
      <TikTokHeadline campaign={campaign} heroId={heroId} channel={channel}>
        {campaign.headline}
      </TikTokHeadline>
      <TikTokSubline campaign={campaign} heroId={heroId} channel={channel}>
        {campaign.subline}
      </TikTokSubline>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: theme.inkSoft }}>
        Tik hieronder je energie. Zo ziet Structuro morgenochtend eruit.
      </p>

      <div
        className="mt-6 rounded-[22px] border p-5 shadow-lg"
        style={{ backgroundColor: theme.surface, borderColor: theme.surfaceBorder }}
      >
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.muted }}>
          Hoeveel energie heb je?
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO_ENERGY.map((level) => {
            const active = energy === level;
            const accent = theme.isStory ? theme.ctaBg : campaign.accent;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setEnergy(level)}
                className="rounded-xl border px-1 py-3 text-sm font-bold transition"
                style={{
                  borderColor: active ? accent : theme.surfaceBorder,
                  backgroundColor: active ? accent : theme.surface,
                  color: active ? theme.ctaText : theme.ink,
                }}
              >
                {level}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider" style={{ color: theme.muted }}>
          Vandaag → {tasks.length} {tasks.length === 1 ? "taak" : "taken"}
        </p>
        <ul className="mt-2 space-y-2">
          {tasks.map((task) => (
            <li
              key={task}
              className="flex items-center gap-3 rounded-xl px-3 py-3"
              style={{
                backgroundColor: theme.isDark ? "rgba(255,255,255,0.06)" : "#F5F6FB",
              }}
            >
              <span
                className="h-5 w-5 shrink-0 rounded-md border-2"
                style={{ borderColor: theme.isStory ? "#2D5A56" : campaign.accent }}
                aria-hidden
              />
              <span className="text-sm font-semibold" style={{ color: theme.ink }}>
                {task}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </TikTokLandingShell>
  );
}

export function HeroLayoutC(props: HeroProps) {
  const { campaign, heroId, channel } = props;
  const theme = getLpThemeTokens(campaign, heroId, channel);

  return (
    <TikTokLandingShell {...props}>
      {theme.isStory ? (
        <StoryEyebrow onNavy={theme.isDark}>
          Voor ADHD-breinen die niet beginnen
        </StoryEyebrow>
      ) : (
        <div
          className="inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm font-semibold"
          style={{ borderColor: theme.surfaceBorder, color: theme.eyebrowClass }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Voor breinen die vastlopen op starten
        </div>
      )}
      <TikTokHeadline campaign={campaign} heroId={heroId} channel={channel}>
        {campaign.headline}
      </TikTokHeadline>
      <TikTokSubline campaign={campaign} heroId={heroId} channel={channel}>
        {campaign.subline}
      </TikTokSubline>
      <p className="mt-6 text-sm" style={{ color: theme.muted }}>
        Eén keer &apos;s ochtends je energie kiezen. Structuro zet 1, 2 of 3 taken klaar. Meer niet.
      </p>
    </TikTokLandingShell>
  );
}

export function HeroLayoutD(props: HeroProps) {
  const { campaign, heroId, channel } = props;
  const theme = getLpThemeTokens(campaign, heroId, channel);

  return (
    <TikTokLandingShell {...props} mainClassName="items-center text-center">
      {theme.isStory ? (
        <StoryEyebrow onNavy={theme.isDark}>
          Voor ADHD-breinen die niet beginnen
        </StoryEyebrow>
      ) : (
        <TikTokEyebrow campaign={campaign} heroId={heroId} channel={channel}>
          Voor het ADHD-brein
        </TikTokEyebrow>
      )}
      <TikTokHeadline campaign={campaign} heroId={heroId} channel={channel} centered>
        {campaign.headline}
      </TikTokHeadline>
      <TikTokSubline campaign={campaign} heroId={heroId} channel={channel} centered>
        {campaign.subline}
      </TikTokSubline>
    </TikTokLandingShell>
  );
}

export function HeroLayoutE(props: HeroProps) {
  const { campaign, heroId, channel } = props;
  const theme = getLpThemeTokens(campaign, heroId, channel);
  const accent = theme.isStory ? "#2D5A56" : campaign.accent;

  return (
    <TikTokLandingShell {...props}>
      {theme.isStory ? (
        <StoryEyebrow onNavy={theme.isDark}>
          Voor ADHD-breinen die niet beginnen
        </StoryEyebrow>
      ) : (
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Voor ADHD-breinen die vastlopen
        </div>
      )}
      <TikTokHeadline campaign={campaign} heroId={heroId} channel={channel}>
        {campaign.headline}
      </TikTokHeadline>
      <TikTokSubline campaign={campaign} heroId={heroId} channel={channel}>
        {campaign.subline}
      </TikTokSubline>

      <ol className="relative mt-8 space-y-4 pl-2">
        <div
          className="absolute bottom-6 left-[19px] top-6 w-0.5"
          style={{ background: `linear-gradient(${accent}, transparent)` }}
          aria-hidden
        />
        {LP_RITUAL_STEPS.map((step, index) => (
          <li key={step.title} className="relative flex items-start gap-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white"
              style={{ backgroundColor: accent }}
            >
              {index + 1}
            </span>
            <div>
              <p className="text-base font-bold" style={{ color: theme.ink }}>
                {step.title}
              </p>
              <p className="text-sm" style={{ color: theme.muted }}>
                {step.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </TikTokLandingShell>
  );
}

const HERO_LAYOUTS: Record<
  LpHeroId,
  React.ComponentType<HeroProps>
> = {
  A: HeroLayoutA,
  B: HeroLayoutB,
  C: HeroLayoutC,
  D: HeroLayoutD,
  E: HeroLayoutE,
};

export function TikTokHeroLayout(props: HeroProps) {
  const Layout = HERO_LAYOUTS[props.heroId];
  return <Layout {...props} />;
}
