"use client";

import dynamic from "next/dynamic";

/**
 * Frisse start + return-reminders: niet in first-paint JS van onboarding/home.
 * Alleen client-side; ssr:false mag niet in de Server Component layout.
 */
const FrisseStartOverlay = dynamic(
  () =>
    import("./FrisseStartOverlay").then((m) => m.FrisseStartOverlay),
  { ssr: false },
);
const V2ReturnReminderScheduler = dynamic(
  () =>
    import("./V2ReturnScheduler").then((m) => m.V2ReturnReminderScheduler),
  { ssr: false },
);
const V2ReturnPermissionPrompt = dynamic(
  () =>
    import("./V2ReturnPermissionPrompt").then(
      (m) => m.V2ReturnPermissionPrompt,
    ),
  { ssr: false },
);

export function V2LayoutOverlays() {
  return (
    <>
      <V2ReturnReminderScheduler />
      <FrisseStartOverlay />
      <V2ReturnPermissionPrompt />
    </>
  );
}
