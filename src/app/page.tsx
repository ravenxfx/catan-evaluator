import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Catan Evaluator</h1>
        <p className="mt-2 text-slate-600">Pick what you want to do:</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/random"
            className="rounded-3xl border bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">🎲 Find Boards</div>
            <div className="mt-1 text-sm text-slate-600">Randomize & Super Search high-balance boards.</div>
          </Link>

          <Link
            href="/evaluate"
            className="rounded-3xl border bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">🧪 Evaluate a Board</div>
            <div className="mt-1 text-sm text-slate-600">Paint your board and check balance & markers.</div>
          </Link>
        </div>
      </div>
    </main>
  );
}