/** Zichtbare placeholder i.p.v. leeg wit scherm tijdens shell- of route-laden. */
export default function AppShellSuspenseFallback() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-[var(--st-bg)] px-5 pb-6 pt-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-xl bg-gray-200/90" />
          <div className="h-4 w-52 rounded-lg bg-gray-100" />
        </div>
        <div className="h-24 rounded-3xl bg-gray-100/90" />
        <div className="h-32 rounded-3xl bg-gray-100/80" />
      </div>
      <span className="sr-only">Laden…</span>
    </div>
  );
}
