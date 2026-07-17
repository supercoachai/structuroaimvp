import { useCallback, useRef, useState } from "react";

import type { AuthCaptchaHandle } from "@/components/auth/AuthCaptcha";
import { isAuthCaptchaEnabled } from "@/lib/auth/captcha";

export function useAuthCaptcha() {
  const captchaRef = useRef<AuthCaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const enabled = isAuthCaptchaEnabled();

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    captchaRef.current?.reset();
  }, []);

  const resolveCaptchaToken = useCallback((): string | undefined => {
    if (!enabled) return undefined;
    return captchaToken ?? undefined;
  }, [enabled, captchaToken]);

  const captchaReady = !enabled || Boolean(captchaToken);

  return {
    enabled,
    captchaRef,
    captchaToken,
    setCaptchaToken,
    resetCaptcha,
    resolveCaptchaToken,
    captchaReady,
  };
}
