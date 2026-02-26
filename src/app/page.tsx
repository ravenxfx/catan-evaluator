import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-12">

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Catan Board Evaluator & Catan Board Finder
        </h1>

        <p className="mt-4 text-slate-600 text-base sm:text-lg">
          Analyze, randomize and optimize your Settlers of Catan boards.
          Find high-balance boards, best starting positions and fair resource distribution instantly.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/random"
            className="rounded-3xl border bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="text-xl font-semibold">🎲 Catan Board Finder</div>
            <div className="mt-2 text-sm text-slate-600">
              Generate balanced Catan boards. Use Super Search to find optimal setups.
            </div>
          </Link>

          <Link
            href="/evaluate"
            className="rounded-3xl border bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="text-xl font-semibold">🧪 Catan Board Evaluator</div>
            <div className="mt-2 text-sm text-slate-600">
              Paint resources and numbers to analyze board balance and starting spots.
            </div>
          </Link>
        </div>

        {/* SEO keyword cloud section */}
        <section className="mt-16 rounded-3xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Catan Board Tools – Multi-Language Keywords
          </h2>

          <div className="mt-6 space-y-4 text-slate-600 leading-relaxed text-sm sm:text-base">

            <p>
              Catan board generator • Catan board randomizer • Best Catan starting positions •
              Balanced Catan board • Fair Catan setup • Catan resource distribution calculator •
              Catan strategy tool • Catan settlement placement optimizer
            </p>

            <p>
              Catan Spielfeld Generator • Siedler von Catan Startpositionen •
              Catan ausgewogenes Brett • Catan Ressourcen Verteilung Rechner •
              Catan Strategie Tool • Catan Aufbau optimieren
            </p>

            <p>
              Générateur plateau Catan • Positions de départ Catan •
              Plateau Catan équilibré • Optimisation colonie Catan •
              Analyse distribution ressources Catan
            </p>

            <p>
              Generador tablero Catan • Mejores posiciones iniciales Catan •
              Tablero Catan equilibrado • Distribución recursos Catan •
              Estrategia Colonos de Catan
            </p>

            <p>
              Generatore mappa Catan • Posizioni iniziali Catan •
              Tabellone Catan bilanciato • Distribuzione risorse Catan •
              Strategia Catan
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}