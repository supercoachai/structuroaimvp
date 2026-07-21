import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { SECURITY_HEADERS } from "./src/lib/securityHeaders";

/** Alleen tijdens `next dev` (true). Bij `next build` is NODE_ENV production → altijd uit in clientbundle. */
const devResetToolbarEnabled = process.env.NODE_ENV === "development";
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /** posthog-node entrypoint side-effects (errorPropertiesBuilder) breken bij webpack-bundling. */
  serverExternalPackages: ["posthog-node", "@posthog/core"],
  env: {
    NEXT_PUBLIC_STRUCTURO_DEV_RESET: devResetToolbarEnabled ? "1" : "0",
    /**
     * Vercel levert VERCEL_GIT_COMMIT_SHA/VERCEL_ENV automatisch, maar NIET de NEXT_PUBLIC_-
     * varianten die client-side error-tags nodig hebben. Hier mappen we ze door (build-time),
     * zodat $exception-events in productie de echte release/omgeving dragen i.p.v. "local".
     */
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/ph/static/:path*",
          destination: "https://eu-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/ph/:path*",
          destination: "https://eu.i.posthog.com/:path*",
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...SECURITY_HEADERS],
      },
    ];
  },
  async redirects() {
    /**
     * Legacy waitlist-URL's zijn organisch verkeer. Doorsturen naar de acquisitie-bridge
     * /start met structuro_eu-attributie zodat de funnel cta_clicked -> /start ->
     * signup_completed intact blijft. Nooit naar /tiktok (paid social) redirecten.
     * De /wachtlijst en /inschrijven paden zonder-trailing-slash landen op de
     * bestaande Next-pages (die zelf redirecten met eventuele source-param).
     */
    const LEGACY_WAITLIST_TARGET =
      "/start?utm_source=structuro_eu&utm_medium=organic&utm_campaign=waitlist_legacy&utm_content=waitlist_legacy";
    return [
      // Engelse bio-links: echte HTTP-redirect (query params blijven behouden).
      {
        source: "/en/start",
        destination: "/start?lang=en",
        permanent: false,
      },
      {
        source: "/en/tiktok",
        destination: "/tiktok?lang=en",
        permanent: false,
      },
      // Engelse en hoofdlettervarianten: statische redirect (geen page-equivalent).
      {
        source: "/waitlist",
        destination: LEGACY_WAITLIST_TARGET,
        permanent: true,
      },
      {
        source: "/waitlist/:path*",
        destination: LEGACY_WAITLIST_TARGET,
        permanent: true,
      },
      {
        source: "/Wachtlijst",
        destination: LEGACY_WAITLIST_TARGET,
        permanent: true,
      },
      {
        source: "/Wachtlijst/:path*",
        destination: LEGACY_WAITLIST_TARGET,
        permanent: true,
      },
      {
        source: "/Inschrijven",
        destination: LEGACY_WAITLIST_TARGET,
        permanent: true,
      },
      {
        source: "/Inschrijven/:path*",
        destination: LEGACY_WAITLIST_TARGET,
        permanent: true,
      },
      // Deep-paths onder /wachtlijst en /inschrijven: statisch, geen source-preservatie
      // nodig omdat historische deep-links geen ?source= droegen. `:path+` (minstens
      // 1 segment) zorgt dat /wachtlijst en /inschrijven zelf naar de app-pages
      // gaan die de query wél kunnen doorgeven.
      {
        source: "/wachtlijst/:path+",
        destination: LEGACY_WAITLIST_TARGET,
        permanent: true,
      },
      {
        source: "/inschrijven/:path+",
        destination: LEGACY_WAITLIST_TARGET,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "structuroaimvp-cyan.vercel.app",
          },
        ],
        destination: "https://www.structuro.ai/:path*",
        permanent: true,
      },
    ];
  },
  /* config options here */
  // Disable ESLint during builds for faster deployment (optional)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript errors during builds (optional - only if needed)
  typescript: {
    ignoreBuildErrors: false, // Keep false to catch real errors
  },
  /** Voorkomt corrupte .next/webpack chunks (leeg scherm op /settings, /todo, enz.). */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

const baseConfig = withBundleAnalyzer(nextConfig);

/**
 * Source maps uploaden naar PostHog Error Tracking (leesbare stack traces in productie).
 *
 * Alleen actief als build-time secrets aanwezig zijn én de key een Personal API key is
 * (`phx_…`, niet de project key `phc_…` / NEXT_PUBLIC_POSTHOG_KEY).
 *
 * Vercel: POSTHOG_API_KEY (of POSTHOG_PERSONAL_API_KEY) + POSTHOG_PROJECT_ID (175224).
 * Personal key: PostHog → Settings → Personal API keys → Create key.
 */
function getPostHogSourcemapConfig():
  | { personalApiKey: string; envId: string }
  | null {
  const personalApiKey = (
    process.env.POSTHOG_PERSONAL_API_KEY ?? process.env.POSTHOG_API_KEY
  )?.trim();
  const envId = (
    process.env.POSTHOG_ENV_ID ?? process.env.POSTHOG_PROJECT_ID
  )?.trim();
  if (!personalApiKey?.startsWith("phx_") || !envId) return null;
  return { personalApiKey, envId };
}

const posthogSourcemaps = getPostHogSourcemapConfig();

export default posthogSourcemaps
  ? withPostHogConfig(baseConfig, {
      personalApiKey: posthogSourcemaps.personalApiKey,
      envId: posthogSourcemaps.envId,
      host: "https://eu.posthog.com",
      sourcemaps: {
        enabled: true,
        version: process.env.VERCEL_GIT_COMMIT_SHA,
        deleteAfterUpload: true,
      },
    })
  : baseConfig;
