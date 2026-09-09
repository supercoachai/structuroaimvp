/** Publieke, write-only pixel-key. Mag in clientcode. */
export const OPINLY_WRITE_KEY =
  process.env.NEXT_PUBLIC_OPINLY_WRITE_KEY?.trim() ||
  "pk-Gv7gZB0BSFTfl9ALPk46klI1Z8xGLgERo1ietWc";

export const OPINLY_PIXEL_SRC = "https://static.opinly.ai/p.js";
