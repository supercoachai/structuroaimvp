import { getOpinlyAnonId } from "./browser";

/** Veldnaam in JSON-bodies naar checkout-API's. */
export function opinlyAnonIdBody(): { opinlyAnonId?: string } {
  const opinlyAnonId = getOpinlyAnonId();
  return opinlyAnonId ? { opinlyAnonId } : {};
}
