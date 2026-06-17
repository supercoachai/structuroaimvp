import type { BridgeChannel } from "@/lib/acquisition/bridgePaths";
import type { LpCampaign, LpHeroId } from "@/lib/tiktok/lpConfig";

export type LpThemeTokens = {
  pageBg: string;
  ink: string;
  inkSoft: string;
  muted: string;
  surface: string;
  surfaceBorder: string;
  headlineClass: string;
  eyebrowClass: string;
  isDark: boolean;
  isStory: boolean;
  ctaBg: string;
  ctaText: string;
  footerBg: string;
};

const STORY_LAYER: LpThemeTokens = {
  pageBg: "#FDFBF4",
  ink: "#1A1A1B",
  inkSoft: "#5C6478",
  muted: "#5C6478",
  surface: "#FFFFFF",
  surfaceBorder: "rgba(26, 26, 27, 0.1)",
  headlineClass:
    "st-story-serif text-[clamp(1.75rem,5.4vw,2rem)] font-semibold leading-[1.12] tracking-tight",
  eyebrowClass: "st-story-eyebrow",
  isDark: false,
  isStory: true,
  ctaBg: "#1A1A1B",
  ctaText: "#FFFFFF",
  footerBg: "rgba(253, 251, 244, 0.94)",
};

const STORY_DARK_LAYER: LpThemeTokens = {
  pageBg: "#1A1A1B",
  ink: "#F5F2EA",
  inkSoft: "rgba(245, 242, 234, 0.72)",
  muted: "rgba(245, 242, 234, 0.55)",
  surface: "rgba(255, 255, 255, 0.06)",
  surfaceBorder: "rgba(245, 242, 234, 0.12)",
  headlineClass:
    "st-story-serif text-[clamp(1.75rem,5.4vw,2rem)] font-semibold leading-[1.12] tracking-tight",
  eyebrowClass: "st-story-eyebrow st-story-eyebrow--on-navy",
  isDark: true,
  isStory: true,
  ctaBg: "#F5F2EA",
  ctaText: "#1A1A1B",
  footerBg: "rgba(26, 26, 27, 0.92)",
};

/** Hero C is dark-focus; andere heroes op lichte achtergrond, ook bij theme: dark campagnes. */
export function getLpThemeTokens(
  campaign: LpCampaign,
  heroId?: LpHeroId,
  channel?: BridgeChannel
): LpThemeTokens {
  if (channel === "organic") {
    return heroId === "C" ? STORY_DARK_LAYER : STORY_LAYER;
  }

  const theme =
    campaign.theme === "dark" && heroId !== "C" ? "light" : campaign.theme;

  switch (theme) {
    case "warm":
      return {
        pageBg: "#F4F1E9",
        ink: "#211C15",
        inkSoft: "rgba(33,28,21,0.66)",
        muted: "rgba(33,28,21,0.46)",
        surface: "#FBF9F4",
        surfaceBorder: "rgba(33,28,21,0.10)",
        headlineClass: "font-serif font-normal tracking-tight",
        eyebrowClass: "text-[rgba(33,28,21,0.4)]",
        isDark: false,
        isStory: false,
        ctaBg: campaign.accent,
        ctaText: "#FFFFFF",
        footerBg: "rgba(255, 255, 255, 0.95)",
      };
    case "dark":
      return {
        pageBg: "#0C1124",
        ink: "#FFFFFF",
        inkSoft: "rgba(255,255,255,0.66)",
        muted: "rgba(255,255,255,0.44)",
        surface: "rgba(255,255,255,0.055)",
        surfaceBorder: "rgba(255,255,255,0.10)",
        headlineClass: "font-sans font-extrabold tracking-tight",
        eyebrowClass: "text-white/75",
        isDark: true,
        isStory: false,
        ctaBg: campaign.accent,
        ctaText: "#FFFFFF",
        footerBg: "rgba(12, 17, 36, 0.92)",
      };
    default:
      return {
        pageBg: "#EEF1FB",
        ink: "#121726",
        inkSoft: "rgba(18,23,38,0.64)",
        muted: "rgba(18,23,38,0.46)",
        surface: "#FFFFFF",
        surfaceBorder: "rgba(18,23,38,0.08)",
        headlineClass: "font-sans font-bold tracking-tight",
        eyebrowClass: "text-[rgba(18,23,38,0.45)]",
        isDark: false,
        isStory: false,
        ctaBg: campaign.accent,
        ctaText: "#FFFFFF",
        footerBg: "rgba(255, 255, 255, 0.95)",
      };
  }
}
