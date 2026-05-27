"use client";

import type { ReactNode } from "react";
import DagafsluitingProgressDots from "@/components/dagafsluiting/DagafsluitingProgressDots";

type DagafsluitingShellHeaderProps = {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  titleExtra?: ReactNode;
};

export default function DagafsluitingShellHeader({
  step,
  title,
  subtitle,
  titleExtra,
}: DagafsluitingShellHeaderProps) {
  return (
    <header className="shrink-0 px-1 pb-5 pt-1 text-center">
      <div className="flex items-center justify-center gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--st-ink)]">{title}</h1>
        {titleExtra}
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--st-muted)]">{subtitle}</p>

      <div className="mt-5">
        <DagafsluitingProgressDots step={step} />
      </div>
    </header>
  );
}
