import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

/** Alleen tijdens `next dev` (true). Bij `next build` is NODE_ENV production → altijd uit in clientbundle. */
const devResetToolbarEnabled = process.env.NODE_ENV === "development";
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_STRUCTURO_DEV_RESET: devResetToolbarEnabled ? "1" : "0",
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

export default withBundleAnalyzer(nextConfig);
