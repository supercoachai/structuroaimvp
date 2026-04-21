import type { NextConfig } from "next";

/** Alleen tijdens `next dev` (true). Bij `next build` is NODE_ENV production → altijd uit in clientbundle. */
const devResetToolbarEnabled = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_STRUCTURO_DEV_RESET: devResetToolbarEnabled ? "1" : "0",
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

export default nextConfig;
