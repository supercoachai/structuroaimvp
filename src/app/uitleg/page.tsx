"use client";

import { useI18n } from "@/lib/i18n";
import { useMemo } from "react";

export default function UitlegPage() {
  const { t: tr } = useI18n();

  const routineSteps = useMemo(
    () => [
      {
        n: 1,
        icon: "📝",
        title: tr("uitleg.s1t"),
        text: tr("uitleg.s1x"),
        bg: "bg-blue-50",
      },
      {
        n: 2,
        icon: "🔋",
        title: tr("uitleg.s2t"),
        text: tr("uitleg.s2x"),
        bg: "bg-amber-50",
      },
      {
        n: 3,
        icon: "⏱️",
        title: tr("uitleg.s3t"),
        text: tr("uitleg.s3x"),
        bg: "bg-slate-50",
      },
      {
        n: 4,
        icon: "🏅",
        title: tr("uitleg.s4t"),
        text: tr("uitleg.s4x"),
        bg: "bg-emerald-50",
      },
    ],
    [tr]
  );

  return (
    <>
      <div
        className="min-h-full px-4 sm:px-6 pt-14 sm:pt-16 pb-6 sm:pb-8"
        style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}
      >
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
            <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 shadow-sm">
              <span className="text-xl">🧭</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
              {tr("uitleg.title")}
            </h1>
            <p className="mt-2 max-w-md text-sm text-slate-500">{tr("uitleg.subtitle")}</p>
          </header>

          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{tr("uitleg.routineTitle")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {routineSteps.map((s) => (
                <div key={s.n} className={`rounded-2xl p-4 border border-gray-100 ${s.bg}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center text-lg">
                      {s.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-500 mb-1">{s.n}.</div>
                      <div className="text-sm font-semibold text-gray-900 leading-snug">{s.title}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-600 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{tr("uitleg.tipsTitle")}</h2>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    <span className="font-semibold">{tr("uitleg.tip1a")}</span>
                    {tr("uitleg.tip1b")}
                  </li>
                  <li>
                    <span className="font-semibold">{tr("uitleg.tip2a")}</span>
                    {tr("uitleg.tip2b")}
                  </li>
                  <li>
                    <span className="font-semibold">{tr("uitleg.tip3a")}</span>
                    {tr("uitleg.tip3b")}
                  </li>
                  <li>
                    <span className="font-semibold">{tr("uitleg.tipDoneTitle")}</span> {tr("uitleg.tipDoneBody")}
                  </li>
                  <li>
                    <span className="font-semibold">{tr("uitleg.tipSteerTitle")}</span> {tr("uitleg.tipSteerBody")}
                  </li>
                  <li>
                    <span className="font-semibold">{tr("uitleg.tipPickTitle")}</span>
                    {tr("uitleg.tipPickBody")}
                  </li>
                </ul>
              </div>
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-slate-50 border border-gray-200 items-center justify-center text-xl flex-shrink-0">
                🗂️
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{tr("uitleg.rewardsTitle")}</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <span className="font-semibold">{tr("uitleg.rewards1a")}</span> {tr("uitleg.rewards1b")}
              </li>
              <li>
                <span className="font-semibold">{tr("uitleg.rewards2a")}</span> {tr("uitleg.rewards2b")}
              </li>
              <li>
                <span className="font-semibold">{tr("uitleg.rewards3a")}</span> {tr("uitleg.rewards3b")}
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{tr("uitleg.whyTitle")}</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{tr("uitleg.whyBody")}</p>
              </div>
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 items-center justify-center text-xl flex-shrink-0">
                🧠
              </div>
            </div>
          </section>

          <p className="text-center text-sm text-slate-500 pb-4">{tr("uitleg.closing")}</p>
        </main>
      </div>
    </>
  );
}
