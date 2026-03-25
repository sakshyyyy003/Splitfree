import Link from "next/link";

export default function Home() {
  return (
    <main>
      {/* Nav */}
      <nav className="absolute left-0 right-0 top-0 z-10 px-4 py-5 sm:px-6">
        <span className="text-xl font-bold text-white">Split<span className="text-hotgreen">free</span></span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-black px-4 py-28 text-white sm:px-6 sm:py-40">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,210,106,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,210,106,0.07) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-6 text-sm font-medium uppercase tracking-ultra text-hotgreen">
            India&apos;s boldest expense splitter
          </p>
          <h1 className="mb-8 text-5xl font-bold leading-none sm:text-6xl lg:text-7xl">
            <span className="block">SPLIT BILLS.</span>
            <span className="block mt-4">
              NOT{" "}
              <span className="bg-highlight px-1.5 text-black">
                FRIENDSHIPS.
              </span>
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-xl font-normal text-gray-400 sm:text-2xl">
            No more awkward money talks. Track shared expenses, settle debts
            instantly, stay friends forever.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="bg-hotgreen px-10 py-5 text-center text-lg font-bold text-black transition-colors hover:bg-lime"
            >
              GET STARTED FREE
            </Link>
            <Link
              href="/login"
              className="border-2 border-white px-10 py-5 text-center text-lg font-bold text-white transition-colors hover:bg-white hover:text-black"
            >
              LOG IN
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Blocks */}
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        {/* Block 1: White — numbered features */}
        <div className="border border-gray-200 bg-white p-8 shadow-md sm:p-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 text-5xl font-bold text-hotgreen">01</div>
              <h3 className="mb-3 text-2xl font-bold">ADD EXPENSES</h3>
              <p className="text-lg text-textsec">
                Enter the amount, choose how to split. Equal, exact, or
                custom. That&apos;s it.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 text-5xl font-bold text-hotgreen">02</div>
              <h3 className="mb-3 text-2xl font-bold">TRACK BALANCES</h3>
              <p className="text-lg text-textsec">
                See who owes what, in real time. No spreadsheets. No mental
                math.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 text-5xl font-bold text-hotgreen">03</div>
              <h3 className="mb-3 text-2xl font-bold">SETTLE UP</h3>
              <p className="text-lg text-textsec">
                Record a payment, clear the balance. Done in one tap.
              </p>
            </div>
          </div>
        </div>

        {/* Block 2: Black — Why Splitfree */}
        <div className="mt-8 bg-black p-8 text-white sm:mt-12 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-xs font-medium uppercase tracking-ultra text-hotgreen">
              Why Splitfree?
            </p>
            <h2 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl">
              MONEY SHOULDN&apos;T
              <br />
              MAKE THINGS{" "}
              <span className="bg-highlight px-1.5 text-black">WEIRD.</span>
            </h2>
            <p className="text-lg text-gray-400">
              We built Splitfree because asking &quot;did you pay me
              back?&quot; shouldn&apos;t ruin your weekend.
            </p>
          </div>
        </div>

        {/* Block 3: Green CTA */}
        <div className="mt-8 bg-hotgreen p-8 sm:mt-12 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-6 text-4xl font-bold text-black sm:text-5xl">
              STOP KEEPING TABS.
              <br />
              START USING ONE.
            </h2>
            <p className="mb-8 text-lg text-black opacity-80">
              Join thousands of Indians who split without the stress.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-black px-12 py-5 text-lg font-bold text-white transition-colors hover:bg-gray-900"
            >
              GET STARTED NOW
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
