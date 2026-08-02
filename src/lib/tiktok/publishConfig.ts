import { getAppOrigin } from "@/lib/appUrl";

/** Scopes voor audit-demo: connect + direct photo publish. */
export const TIKTOK_PUBLISH_SCOPES = "user.info.basic,video.publish";

export const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
export const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
export const TIKTOK_REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/";
export const TIKTOK_CREATOR_INFO_URL =
  "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
export const TIKTOK_CONTENT_INIT_URL =
  "https://open.tiktokapis.com/v2/post/publish/content/init/";

export const TIKTOK_PUBLISH_PAGE_PATH = "/activiteit/tiktok-publish";
export const TIKTOK_OAUTH_CALLBACK_PATH = "/api/admin/tiktok/oauth/callback";

export function getTikTokClientKey(): string {
  return process.env.TIKTOK_CLIENT_KEY?.trim() ?? "";
}

export function getTikTokClientSecret(): string {
  return process.env.TIKTOK_CLIENT_SECRET?.trim() ?? "";
}

/** Statische redirect URI; moet exact matchen met TikTok Developer Portal. */
export function getTikTokRedirectUri(): string {
  const explicit = process.env.TIKTOK_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${getAppOrigin()}${TIKTOK_OAUTH_CALLBACK_PATH}`;
}

export function isTikTokPublishConfigured(): boolean {
  return Boolean(getTikTokClientKey() && getTikTokClientSecret());
}
