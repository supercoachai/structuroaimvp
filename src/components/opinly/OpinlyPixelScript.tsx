import Script from "next/script";

import { OPINLY_PIXEL_SRC, OPINLY_WRITE_KEY } from "@/lib/opinly/writeKey";

export function OpinlyPixelScript() {
  return (
    <Script
      id="opinly-pixel"
      strategy="afterInteractive"
      src={OPINLY_PIXEL_SRC}
      data-key={OPINLY_WRITE_KEY}
    />
  );
}
