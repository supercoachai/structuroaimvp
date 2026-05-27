"use client";

type DagstartStructuroPickedProps = {
  title: string;
  sub: string;
};

export default function DagstartStructuroPicked({ title, sub }: DagstartStructuroPickedProps) {
  return (
    <div
      className="flex w-full flex-1 flex-col items-center justify-center rounded-2xl border px-4 py-6 text-center sm:px-5 sm:py-8"
      style={{
        borderColor: "var(--st-line)",
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%)",
        boxShadow:
          "0 0 0 0.5px rgba(14,23,48,0.08), 0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 8px -4px rgba(14,23,48,0.08)",
      }}
    >
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full sm:mb-4 sm:h-14 sm:w-14"
        style={{ background: "var(--st-blue-haze)", color: "var(--st-blue)" }}
        aria-hidden
      >
        <svg
          className="h-6 w-6 sm:h-7 sm:w-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-[var(--st-ink)] sm:text-xl">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--st-muted)] sm:text-sm">
        {sub}
      </p>
    </div>
  );
}
