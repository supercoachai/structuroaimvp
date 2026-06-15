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
};

/** Hero C is dark-focus; andere heroes op lichte achtergrond, ook bij theme: dark campagnes. */
export function getLpThemeTokens(
  campaign: LpCampaign,
  heroId?: LpHeroId
): LpThemeTokens {
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
      };
  }
}
