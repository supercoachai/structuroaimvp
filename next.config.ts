import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withPostHogConfig } from "@posthog/nextjs-config";

/** Alleen tijdens `next dev` (true). Bij `next build` is NODE_ENV production → altijd uit in clientbundle. */
const devResetToolbarEnabled = process.env.NODE_ENV === "development";
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
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
  async redirects() {
    return [
      {
        source: "/waitlist",
        destination: "/inschrijven",
        permanent: true,
      },
      {
        source: "/Wachtlijst",
        destination: "/wachtlijst",
        permanent: false,
      },
      {
        source: "/Wachtlijst/:path*",
        destination: "/wachtlijst/:path*",
        permanent: false,
      },
      {
        source: "/Inschrijven",
        destination: "/inschrijven",
        permanent: false,
      },
      {
        source: "/Inschrijven/:path*",
        destination: "/inschrijven/:path*",
        permanent: false,
      },
      {
        source: "/wachtlijst",
        destination: "/inschrijven",
        permanent: true,
      },
      {
        source: "/wachtlijst/",
        destination: "/inschrijven",
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
};

const baseConfig = withBundleAnalyzer(nextConfig);

/**
 * Source maps uploaden naar PostHog Error Tracking (leesbare stack traces in productie).
 *
 * Alleen actief als de build-time env vars aanwezig zijn (op Vercel). Zonder deze keys
 * (lokaal / preview zonder secrets) valt het terug op de gewone config, zodat builds
 * niet breken. Veldnamen (`envId`, `sourcemaps.version`) zijn geverifieerd tegen de
 * geinstalleerde @posthog/nextjs-config types, niet tegen de oude audit-snippet.
 */
const posthogApiKey = process.env.POSTHOG_API_KEY;
const posthogProjectId = process.env.POSTHOG_PROJECT_ID;

export default posthogApiKey && posthogProjectId
  ? withPostHogConfig(baseConfig, {
      personalApiKey: posthogApiKey,
      envId: posthogProjectId,
      host: "https://eu.posthog.com",
      sourcemaps: {
        enabled: true,
        version: process.env.VERCEL_GIT_COMMIT_SHA,
        deleteAfterUpload: true,
      },
    })
  : baseConfig;
