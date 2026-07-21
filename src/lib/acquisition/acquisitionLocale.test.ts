import assert from "node:assert/strict";
import {
  prefersEnglishFromAcceptLanguage,
  resolveAcquisitionLocale,
} from "./acquisitionLocale";
import { localizeLpCampaign } from "../tiktok/lpLocalized";
import { LP_CAMPAIGNS } from "../tiktok/lpConfig";

assert.equal(
  resolveAcquisitionLocale({ langParam: "en", acceptLanguage: "nl-NL" }),
  "en",
  "lang query wint"
);

assert.equal(
  resolveAcquisitionLocale({ acceptLanguage: "en-US,en;q=0.9" }),
  "en",
  "Accept-Language en"
);

assert.equal(
  resolveAcquisitionLocale({ acceptLanguage: "nl-NL,nl;q=0.9" }),
  "nl",
  "Accept-Language nl"
);

assert.equal(prefersEnglishFromAcceptLanguage("en-GB,en;q=0.8"), true);

const weten = LP_CAMPAIGNS.find((c) => c.id === "weten")!;
const enWeten = localizeLpCampaign(weten, "en");
assert.match(enWeten.cta, /Try it for free/i);
assert.match(enWeten.headline, /know exactly/i);

console.log("acquisitionLocale.test.ts: ok");
