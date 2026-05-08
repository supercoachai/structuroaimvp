"use client";

import { useI18n } from "@/lib/i18n";

/**
 * Betaaltrust-strook met vereenvoudigde merk-markeringen voor herkenbaarheid.
 */
export function PaymentTrustStrip() {
  const { t } = useI18n();

  return (
    <div className="mt-8 flex w-full flex-col items-center gap-3">
      <p className="text-center text-xs font-medium text-slate-500">
        {t("subscription.paymentTrustLabel")}
      </p>
      <ul
        className="flex max-w-md flex-wrap items-center justify-center gap-4 px-2 opacity-90"
        aria-label={t("subscription.paymentTrustLabel")}
      >
        <li className="flex h-8 items-center" title="iDEAL">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 32"
            className="h-7 w-auto max-h-[32px]"
            aria-hidden
          >
            <rect width="48" height="32" rx="4" fill="#fff" stroke="#E2E8F0" />
            <rect x="6" y="10" width="12" height="12" rx="1" fill="#CC0066" />
            <rect x="18" y="10" width="12" height="12" rx="1" fill="#0066CC" />
          </svg>
        </li>
        <li className="flex h-8 items-center" title="Mastercard">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 32"
            className="h-7 w-auto max-h-[32px]"
            aria-hidden
          >
            <rect width="48" height="32" rx="4" fill="#fff" stroke="#E2E8F0" />
            <circle cx="19" cy="16" r="8" fill="#EB001B" opacity="0.92" />
            <circle cx="29" cy="16" r="8" fill="#F79E1B" opacity="0.92" />
          </svg>
        </li>
        <li className="flex h-8 items-center" title="Visa">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 32"
            className="h-7 w-auto max-h-[32px]"
            aria-hidden
          >
            <rect width="48" height="32" rx="4" fill="#1A1F71" />
            <text
              x="24"
              y="21"
              textAnchor="middle"
              fill="#fff"
              fontSize="11"
              fontWeight="700"
              fontFamily="system-ui,sans-serif"
            >
              VISA
            </text>
          </svg>
        </li>
        <li className="flex h-8 items-center" title="Apple Pay">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 52 32"
            className="h-7 w-auto max-h-[32px]"
            aria-hidden
          >
            <rect width="52" height="32" rx="4" fill="#000" />
            <text
              x="26"
              y="20"
              textAnchor="middle"
              fill="#fff"
              fontSize="9"
              fontWeight="600"
              fontFamily="system-ui,sans-serif"
            >
               Pay
            </text>
          </svg>
        </li>
        <li className="flex h-8 items-center" title="Google Pay">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 32"
            className="h-7 w-auto max-h-[32px]"
            aria-hidden
          >
            <rect width="48" height="32" rx="4" fill="#fff" stroke="#E2E8F0" />
            <path
              fill="#4285F4"
              d="M24 11.5c1 0 1.9.3 2.7.9l2-2C27.5 9.5 25.8 9 24 9c-2.2 0-4.2 1.2-5.3 3l2.5 2c.4-1.3 1.6-2.3 3-2.3z"
            />
            <path
              fill="#34A853"
              d="M18.9 15.9c-.1.4-.2.9-.2 1.4s.1 1 .2 1.4l-2.5 2c-.5-1.1-.9-2.3-.9-3.6s.3-2.5.9-3.6l2.5 2z"
            />
            <path
              fill="#FBBC05"
              d="M24 21.5c-1.5 0-2.8-.8-3.4-2l2.5-2c.3.9 1.1 1.5 2.1 1.5h.1l1.9 1.4c-.5.4-1.2.6-2 .6z"
            />
            <path
              fill="#EA4335"
              d="M27.9 17.9l-.1-.3H24v1.6h2.2c-.1.6-.3 1.1-.8 1.5l2.5 2c-.4.5-2.8 2-6 2-3.7 0-6.9-3-6.9-6.9s3.2-7 7-7c2 0 3.8.8 5.3 2.1l-2.3 2.2c-.7-.8-2-1.3-3-1.3z"
            />
          </svg>
        </li>
      </ul>
    </div>
  );
}
