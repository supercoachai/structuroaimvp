"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { LoginShell } from "@/components/login/LoginShell";

type AuthMessagePanelProps = {
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  children?: ReactNode;
};

/** Auth-recovery / foutpanel in dezelfde stijl als /login (LoginShell + v2-gate). */
export function AuthMessagePanel({
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: AuthMessagePanelProps) {
  return (
    <LoginShell>
      <div className="v2-login-gate v2-fade" aria-live="polite">
        <div className="v2-login-gate__copy">
          <h1 className="v2-login-gate__title">{title}</h1>
          <p className="v2-login-gate__sub">{body}</p>
        </div>
        {children}
        <div className="v2-login-gate__actions">
          <Link href={primaryHref} className="btn-primary w-full">
            {primaryLabel}
          </Link>
          <div className="v2-login-gate__alt-links">
            <Link href={secondaryHref} className="v2-login-gate__text-link">
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </LoginShell>
  );
}
