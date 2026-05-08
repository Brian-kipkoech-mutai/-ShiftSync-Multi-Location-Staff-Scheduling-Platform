import Link from "next/link";

const FEATURES = [
  {
    icon: (
      <svg className="size-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Overtime controls",
    body: "Warnings at 35h, hard blocks at 40h with manager override. Visual cost projections before you commit.",
  },
  {
    icon: (
      <svg className="size-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: "Fairness analytics",
    body: "Premium shift tracking with a fairness score. Spot imbalances across your team before complaints reach your desk.",
  },
  {
    icon: (
      <svg className="size-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
    title: "Instant coverage",
    body: "Drop a shift and qualified staff are notified in real time. Constraint checks run automatically — no spreadsheets.",
  },
  {
    icon: (
      <svg className="size-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
    title: "Multi-location",
    body: "Manage staff across 4 locations in 2 time zones from one dashboard. Scope enforcement keeps data siloed by location.",
  },
  {
    icon: (
      <svg className="size-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    title: "Swap workflow",
    body: "Staff initiate swaps, peers accept, managers approve. Cancellation at any pre-approval stage, full audit trail.",
  },
  {
    icon: (
      <svg className="size-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Constraint engine",
    body: "No double-booking, 10h rest rule, skill matching, cert checks, availability validation — enforced on every assignment.",
  },
];

const STATS = [
  { value: "4", label: "Locations" },
  { value: "2", label: "Time zones" },
  { value: "6", label: "Constraint rules" },
  { value: "100%", label: "Real-time sync" },
];

export default function Home() {
  return (
    <div className="min-h-svh bg-gray-950 flex flex-col text-gray-100">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-white/6">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto w-full">
          <span className="flex items-center gap-2 font-semibold text-sm text-white">
            <span className="flex size-6 items-center justify-center rounded-md bg-teal-500 text-white text-xs font-bold">
              S
            </span>
            ShiftSync
          </span>
          <Link
            href="/login"
            className="rounded-md bg-teal-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-400 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-150 h-100 rounded-full bg-teal-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-400 mb-8">
              <span className="size-1.5 rounded-full bg-teal-400 animate-pulse" />
              Built for multi-location restaurant groups
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-3xl leading-[1.05]">
              Scheduling that<br />
              <span className="text-teal-400">works for you</span>
            </h1>

            <p className="mt-6 text-lg text-gray-400 max-w-lg leading-relaxed">
              Overtime controls, fairness analytics, real-time coverage — all in one place for every location, every shift.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 items-center">
              <Link
                href="/login"
                className="rounded-md bg-teal-500 px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-400 transition-colors"
              >
                Open the app
              </Link>
              <a
                href="#features"
                className="rounded-md px-7 py-3 text-sm font-semibold text-gray-300 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/5 transition-colors"
              >
                See features
              </a>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y border-transparent bg-transparent">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-teal-400">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-20 max-w-7xl mx-auto w-full">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Everything your team needs</h2>
            <p className="mt-3 text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
              From constraint enforcement to fairness reporting — ShiftSync handles the complexity so managers can focus on service.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-white/6 bg-white/3 p-6 hover:border-teal-500/30 hover:bg-white/5 transition-all">
                <div className="flex size-9 items-center justify-center rounded-md bg-teal-500/10 mb-4">
                  {f.icon}
                </div>
                <p className="text-sm font-semibold text-white mb-1.5">{f.title}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="mx-6 mb-20 rounded-xl border border-teal-500/20 bg-teal-500/10 px-8 py-12 max-w-4xl lg:mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Ready to simplify your schedule?</h2>
          <p className="mt-3 text-gray-400 text-sm">Sign in and start building smarter schedules today.</p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-md bg-teal-500 px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-400 transition-colors"
          >
            Get started
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/6 text-center py-6 text-xs text-gray-600">
        © {new Date().getFullYear()} Coastal Eats · ShiftSync
      </footer>
    </div>
  );
}
