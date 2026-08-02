import {
  getTikTokClientKey,
  getTikTokClientSecret,
  getTikTokRedirectUri,
  TIKTOK_CONTENT_INIT_URL,
  TIKTOK_CREATOR_INFO_URL,
  TIKTOK_PUBLISH_SCOPES,
  TIKTOK_REVOKE_URL,
  TIKTOK_TOKEN_URL,
} from "@/lib/tiktok/publishConfig";
import {
  tokensFromOAuthResponse,
  type TikTokStoredTokens,
} from "@/lib/tiktok/publishTokens";

export type TikTokCreatorInfo = {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
};

export type TikTokPublishResult =
  | { ok: true; publish_id: string }
  | { ok: false; error: string; message?: string; status?: number };

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  open_id?: string;
  scope?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  error?: string;
  error_description?: string;
};

async function postForm(
  url: string,
  fields: Record<string, string>
): Promise<{ status: number; json: TokenResponse }> {
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  return { status: res.status, json };
}

export async function exchangeAuthorizationCode(
  code: string
): Promise<
  | { ok: true; tokens: TikTokStoredTokens }
  | { ok: false; error: string; message?: string }
> {
  const clientKey = getTikTokClientKey();
  const clientSecret = getTikTokClientSecret();
  if (!clientKey || !clientSecret) {
    return { ok: false, error: "not_configured" };
  }

  const { status, json } = await postForm(TIKTOK_TOKEN_URL, {
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: getTikTokRedirectUri(),
  });

  if (
    !json.access_token ||
    !json.refresh_token ||
    !json.open_id ||
    json.expires_in == null ||
    json.refresh_expires_in == null
  ) {
    return {
      ok: false,
      error: json.error || "token_exchange_failed",
      message: json.error_description,
    };
  }

  if (status >= 400) {
    return {
      ok: false,
      error: json.error || "token_exchange_failed",
      message: json.error_description,
    };
  }

  return {
    ok: true,
    tokens: tokensFromOAuthResponse({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      open_id: json.open_id,
      scope: json.scope,
      expires_in: json.expires_in,
      refresh_expires_in: json.refresh_expires_in,
    }),
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<
  | { ok: true; tokens: TikTokStoredTokens }
  | { ok: false; error: string; message?: string }
> {
  const clientKey = getTikTokClientKey();
  const clientSecret = getTikTokClientSecret();
  if (!clientKey || !clientSecret) {
    return { ok: false, error: "not_configured" };
  }

  const { status, json } = await postForm(TIKTOK_TOKEN_URL, {
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  if (
    !json.access_token ||
    !json.refresh_token ||
    !json.open_id ||
    json.expires_in == null ||
    json.refresh_expires_in == null
  ) {
    return {
      ok: false,
      error: json.error || "token_refresh_failed",
      message: json.error_description,
    };
  }

  if (status >= 400) {
    return {
      ok: false,
      error: json.error || "token_refresh_failed",
      message: json.error_description,
    };
  }

  return {
    ok: true,
    tokens: tokensFromOAuthResponse({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      open_id: json.open_id,
      scope: json.scope,
      expires_in: json.expires_in,
      refresh_expires_in: json.refresh_expires_in,
    }),
  };
}

export async function revokeAccessToken(accessToken: string): Promise<void> {
  const clientKey = getTikTokClientKey();
  const clientSecret = getTikTokClientSecret();
  if (!clientKey || !clientSecret || !accessToken) return;
  try {
    await postForm(TIKTOK_REVOKE_URL, {
      client_key: clientKey,
      client_secret: clientSecret,
      token: accessToken,
    });
  } catch {
    // best-effort
  }
}

export async function queryCreatorInfo(
  accessToken: string
): Promise<
  | { ok: true; creator: TikTokCreatorInfo }
  | { ok: false; error: string; message?: string }
> {
  const res = await fetch(TIKTOK_CREATOR_INFO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: "{}",
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: Partial<TikTokCreatorInfo>;
    error?: { code?: string; message?: string };
  };

  if (json.error?.code && json.error.code !== "ok") {
    return {
      ok: false,
      error: json.error.code,
      message: json.error.message,
    };
  }

  const data = json.data;
  if (!data?.creator_username) {
    return { ok: false, error: "creator_info_missing" };
  }

  return {
    ok: true,
    creator: {
      creator_avatar_url: data.creator_avatar_url ?? "",
      creator_username: data.creator_username,
      creator_nickname: data.creator_nickname ?? data.creator_username,
      privacy_level_options: Array.isArray(data.privacy_level_options)
        ? data.privacy_level_options
        : ["SELF_ONLY"],
      comment_disabled: Boolean(data.comment_disabled),
    },
  };
}

export async function initPhotoPost(params: {
  accessToken: string;
  title: string;
  description: string;
  privacyLevel: string;
  photoImages: string[];
  photoCoverIndex: number;
  disableComment?: boolean;
  autoAddMusic?: boolean;
}): Promise<TikTokPublishResult> {
  const res = await fetch(TIKTOK_CONTENT_INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      media_type: "PHOTO",
      post_mode: "DIRECT_POST",
      post_info: {
        title: params.title,
        description: params.description,
        privacy_level: params.privacyLevel,
        disable_comment: params.disableComment ?? false,
        auto_add_music: params.autoAddMusic ?? true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_images: params.photoImages,
        photo_cover_index: params.photoCoverIndex,
      },
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: { publish_id?: string };
    error?: { code?: string; message?: string };
  };

  if (json.error?.code && json.error.code !== "ok") {
    return {
      ok: false,
      error: json.error.code,
      message: json.error.message,
      status: res.status,
    };
  }

  const publishId = json.data?.publish_id;
  if (!publishId) {
    return { ok: false, error: "publish_id_missing", status: res.status };
  }

  return { ok: true, publish_id: publishId };
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: getTikTokClientKey(),
    scope: TIKTOK_PUBLISH_SCOPES,
    response_type: "code",
    redirect_uri: getTikTokRedirectUri(),
    state,
    disable_auto_auth: "1",
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

/** Vernieuw access token als die binnen 5 minuten verloopt. */
export async function ensureFreshAccessToken(
  tokens: TikTokStoredTokens
): Promise<
  | { ok: true; tokens: TikTokStoredTokens; refreshed: boolean }
  | { ok: false; error: string; message?: string }
> {
  const now = Math.floor(Date.now() / 1000);
  if (tokens.access_expires_at > now + 300) {
    return { ok: true, tokens, refreshed: false };
  }
  if (tokens.refresh_expires_at <= now) {
    return { ok: false, error: "refresh_expired" };
  }
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  if (!refreshed.ok) return refreshed;
  return { ok: true, tokens: refreshed.tokens, refreshed: true };
}
