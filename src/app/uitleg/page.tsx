"use client";

import AppLayout from "../../components/layout/AppLayout";

export default function UitlegPage() {
  return (
    <AppLayout>
      <div
        className="min-h-full px-4 sm:px-6 pt-14 sm:pt-16 pb-6 sm:pb-8"
        style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}
      >
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
            <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 shadow-sm">
              <span className="text-xl">🧭</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">Hoe werkt Structuro?</h1>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Kort en simpel. Geen gedoe, wél doen.
            </p>
          </header>

          {/* De core loop (visueel) */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dagelijkse routine</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  n: 1,
                  icon: "📝",
                  title: "Dagstart + focuspunten",
                  text: "Kies je Kernfocus, Vervolgstap en Bonusactie. Dit zijn je focuspunten.",
                  bg: "bg-blue-50",
                },
                {
                  n: 2,
                  icon: "🔋",
                  title: "Kies je energie",
                  text: "Laag / normaal / hoog. De app past zich daarop aan.",
                  bg: "bg-amber-50",
                },
                {
                  n: 3,
                  icon: "⏱️",
                  title: "Start Focus Mode",
                  text: "Eén taak tegelijk. Timer aan. Minder ruis.",
                  bg: "bg-slate-50",
                },
                {
                  n: 4,
                  icon: "🏅",
                  title: "Rond af → XP",
                  text: "Voltooi taken, verdien XP en ga level omhoog.",
                  bg: "bg-emerald-50",
                },
              ].map((s) => (
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

          {/* Handige dingen */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Handige dingen om te weten</h2>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    <span className="font-semibold">Afvinken zonder timer:</span> in Taken & Prioriteiten klik je op het gekleurde bolletje.
                  </li>
                  <li>
                    <span className="font-semibold">Voltooide taken:</span> staan in een inklapbare lijst. Je kunt ze terugzetten of legen.
                  </li>
                  <li>
                    <span className="font-semibold">Dagstart is je stuur:</span> daar kies je jouw focuspunten voor vandaag: Kernfocus, Vervolgstap en Bonusactie.
                  </li>
                </ul>
              </div>
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-slate-50 border border-gray-200 items-center justify-center text-xl flex-shrink-0">
                🗂️
              </div>
            </div>
          </section>

          {/* Agenda + Beloningen (2 kolommen op desktop) */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Agenda & Planning</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <span className="font-semibold">Zet taken op een tijd:</span> je ziet je dag als tijdlijn.
                </li>
                <li>
                  <span className="font-semibold">Slepen = verplaatsen:</span> pak een taak en sleep ’m naar een andere tijd.
                </li>
                <li>
                  <span className="font-semibold">Kies je weergave:</span> ochtend/middag/avond of een eigen tijdblok.
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Beloningen</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <span className="font-semibold">XP per taak:</span> elke afgeronde taak geeft XP.
                </li>
                <li>
                  <span className="font-semibold">Level omhoog:</span> bij genoeg XP ga je een level omhoog.
                </li>
                <li>
                  <span className="font-semibold">Streaks & badges:</span> je ziet je voortgang en mijlpalen.
                </li>
              </ul>
            </div>
          </section>

          {/* Waarom dit werkt */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Waarom dit werkt (ADHD-proof)</h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Structuro houdt het klein: minder keuzes, één volgende stap, en plannen op energie in plaats van alleen op tijd.
                  Dat maakt starten makkelijker en geeft sneller “klaar”-momenten.
                </p>
              </div>
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 items-center justify-center text-xl flex-shrink-0">
                🧠
              </div>
            </div>
          </section>
        </main>
      </div>
    </AppLayout>
  );
}

