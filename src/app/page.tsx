import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Hero */}
        <div className="overflow-hidden rounded-4xl border border-foreground/10 bg-white/75 shadow-soft">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-primary/15 bg-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-primary">
                Shared finance, stripped down
              </span>
              <span className="rounded-full border border-foreground/10 bg-white/80 px-4 py-1.5 text-xs font-semibold text-foreground/65">
                INR only
              </span>
            </div>
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Stop chasing screenshots.{" "}
                <span className="text-primary">
                  Splitfree keeps every shared rupee obvious.
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/72 sm:text-lg">
                Built for trips, flats, couples, and team spends. Add expenses
                in seconds, see exactly who owes whom, and settle with fewer
                transactions.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-panel"
              >
                Start Tracking
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-foreground/12 bg-white/80 px-6 py-3.5 text-sm font-bold text-foreground"
              >
                Log In
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-foreground/10 bg-white/85 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-foreground/45">
                  Fast entry
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/75">
                  Equal, exact, percentage, or shares without opening dense
                  calculators.
                </p>
              </div>
              <div className="rounded-3xl border border-foreground/10 bg-white/85 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-foreground/45">
                  Debt simplification
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/75">
                  Surface only the payments that matter, like Aditi owes Rahul
                  ₹640.
                </p>
              </div>
              <div className="rounded-3xl border border-foreground/10 bg-white/85 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-foreground/45">
                  Calm trust
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/75">
                  Warm neutrals and strong contrast make the product feel
                  reliable, not playful.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          {/* Hero Snapshot */}
          <div className="rounded-4xl border border-foreground/10 bg-foreground p-6 text-primary-foreground shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-primary-foreground/55">
                  Hero Snapshot
                </p>
                <h2 className="mt-2 text-2xl font-bold">Goa Trip</h2>
              </div>
              <span className="rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold">
                Pinned
              </span>
            </div>
            <div className="mt-6 rounded-3xl bg-primary-foreground/8 p-5">
              <p className="text-sm text-primary-foreground/60">
                Overall balance
              </p>
              <p className="mt-2 text-4xl font-extrabold">+₹2,480</p>
              <p className="mt-2 text-sm text-chart-5">
                You are owed across 3 groups
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-primary-foreground/8 px-4 py-3">
                  <span>Aditi owes Rahul</span>
                  <span className="font-bold text-chart-3">₹640</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-primary-foreground/8 px-4 py-3">
                  <span>Flat 4B utilities</span>
                  <span className="font-bold text-chart-5">Updated 2h ago</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-sidebar-primary px-4 py-3 text-center text-sm font-bold text-primary"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-2xl border border-primary-foreground/15 px-4 py-3 text-center text-sm font-bold"
              >
                Sign up
              </Link>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-4xl border border-foreground/10 bg-white/80 p-6 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-foreground/45">
              Pricing
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-3xl font-bold">Free</h3>
                <p className="mt-1 text-sm text-foreground/65">
                  Core expense sharing for trips, homes, couples, and one-off
                  splits.
                </p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                v1
              </span>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-foreground/72">
              <li className="rounded-2xl bg-secondary px-4 py-3">
                Unlimited groups and expenses
              </li>
              <li className="rounded-2xl bg-secondary px-4 py-3">
                Google or email authentication
              </li>
              <li className="rounded-2xl bg-secondary px-4 py-3">
                Category analytics and settle-up history
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
