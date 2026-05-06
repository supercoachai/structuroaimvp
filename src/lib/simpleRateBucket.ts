/** Minimale token bucket per sleutel; effectief voor één Fluid/Node-invocation. Serverless heeft geen gedeelde state. */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** @returns true als verzoek doorgaat, false bij 429-logica elders */
export function takeRateToken(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}
