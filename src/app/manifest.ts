import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Structuro",
    short_name: "Structuro",
    description:
      "AI-powered platform voor volwassenen met ADHD-achtige kenmerken",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6FB",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
