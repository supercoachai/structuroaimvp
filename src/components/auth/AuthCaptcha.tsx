"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { forwardRef, useImperativeHandle, useRef } from "react";

import { getAuthCaptchaSiteKey } from "@/lib/auth/captcha";

export type AuthCaptchaHandle = {
  reset: () => void;
};

type AuthCaptchaProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
};

export const AuthCaptcha = forwardRef<AuthCaptchaHandle, AuthCaptchaProps>(
  function AuthCaptcha({ onVerify, onExpire, onError, className }, ref) {
    const siteKey = getAuthCaptchaSiteKey();
    const widgetRef = useRef<HCaptcha>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        widgetRef.current?.resetCaptcha();
      },
    }));

    if (!siteKey) return null;

    return (
      <div className={className}>
        <HCaptcha
          ref={widgetRef}
          sitekey={siteKey}
          onVerify={onVerify}
          onExpire={onExpire}
          onError={onError}
        />
      </div>
    );
  }
);
