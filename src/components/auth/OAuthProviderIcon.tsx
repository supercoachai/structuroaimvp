import type { OAuthProviderId } from "@/lib/auth/authProviders";

type OAuthProviderIconProps = {
  provider: OAuthProviderId;
  className?: string;
};

/** Merkiconen voor social login (links in de knop, zoals TikTok). */
export function OAuthProviderIcon({
  provider,
  className = "h-5 w-5 shrink-0",
}: OAuthProviderIconProps) {
  if (provider === "google") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }

  if (provider === "facebook") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.49 0-1.956.93-1.956 1.886v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
        />
      </svg>
    );
  }

  if (provider === "apple") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.03-.78.83-2.06 1.47-3.17 1.38-.13-1.1.4-2.26 1.17-3.05.8-.84 2.18-1.45 3.21-1.36zM20.76 17.4c-.58 1.34-.86 1.93-1.61 3.12-1.04 1.62-2.51 3.64-4.34 3.65-1.62.02-2.04-1.06-4.25-1.05-2.21.01-2.68 1.07-4.3 1.05-1.83-.02-3.23-1.84-4.27-3.46C.3 17.5-.72 12.7.9 9.34c.9-1.87 2.51-3.05 4.28-3.07 1.69-.03 3.28 1.14 4.25 1.14.96 0 2.77-1.41 4.67-1.2.79.03 3.02.32 4.45 2.42-.11.07-2.65 1.55-2.62 4.63.03 3.67 3.22 4.88 3.25 4.9-.03.07-.51 1.75-1.42 3.24z"
        />
      </svg>
    );
  }

  // Microsoft (azure)
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}
