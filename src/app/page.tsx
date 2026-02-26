// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Catan Boards
        </h1>
        <p className="mt-2 text-slate-800">
          Randomize and evaluate <span className="font-semibold">balanced Catan</span> boards. Reveal best starting
          positions, compare balance, and build custom layouts.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href="/random"
            className="rounded-2xl bg-slate-900 text-white px-6 py-4 font-semibold shadow-sm hover:opacity-95"
          >
            🎲 Find Boards (Randomizer)
          </Link>
          <Link
            href="/evaluate"
            className="rounded-2xl border bg-white text-slate-900 px-6 py-4 font-semibold shadow-sm hover:bg-slate-50"
          >
            🧩 Evaluate Board (Builder)
          </Link>
        </div>

        {/* Stylish SEO “tag cloud” (visible, not hidden spam) */}
        <div className="mt-10 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Popular searches</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Catan board generator",
              "Catan randomizer",
              "Balanced Catan board",
              "Best starting positions",
              "Catan pips",
              "Fair Catan setup",
              "Settlers of Catan map",
              "Catan strategy",
              "Катан поле генератор",
              "Catán generador de tablero",
              "Générateur de plateau Catan",
              "Generatore tabellone Catan",
              "カタン ボード 生成",
              "카탄 보드 생성기",
              "أداة كاتان لتوليد اللوح",
            ].map((k) => (
              <span
                key={k}
                className="rounded-full border bg-slate-50 px-3 py-1 text-sm text-slate-800"
              >
                {k}
              </span>
            ))}
          </div>

          <p className="mt-4 text-sm text-slate-800">
            Tip: Use <span className="font-semibold">AI Super Search</span> on the Randomizer page to hunt for
            high-balance boards (≥ 90).
          </p>
        </div>
      </div>
    </main>
  );
}