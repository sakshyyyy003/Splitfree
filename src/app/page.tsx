import Link from "next/link";

export default function Home() {
  return (
    <main>
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

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-20">
            <div>
              <p className="mb-6 text-sm font-medium uppercase tracking-ultra text-hotgreen">
                India&apos;s boldest expense splitter
              </p>
              <h1 className="mb-8 text-5xl font-bold leading-none sm:text-6xl lg:text-7xl">
                SPLIT BILLS.
                <br />
                NOT{" "}
                <span className="bg-highlight px-1.5 text-black">
                  FRIENDSHIPS.
                </span>
              </h1>
              <p className="mb-10 max-w-xl text-xl font-normal text-gray-400 sm:text-2xl">
                No more awkward money talks. Track shared expenses, settle debts
                instantly, stay friends forever.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
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

            {/* App preview card */}
            <div className="hidden md:flex md:justify-center">
              <div className="relative">
                <div className="absolute -top-6 -right-6 h-20 w-20 bg-hotgreen opacity-20" />
                <div className="absolute -bottom-6 -left-6 h-14 w-14 bg-highlight opacity-30" />

                <div className="relative border-4 border-hotgreen bg-[#F5F5F0] text-black">
                  <div className="flex items-center justify-between bg-black px-4 py-3 text-white">
                    <div>
                      <span className="text-sm font-bold">
                        SPLIT<span className="text-hotgreen">FREE</span>
                      </span>
                      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-gray-400">
                        Goa Trip &middot; 4 people
                      </p>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="flex size-6 items-center justify-center rounded-full border-2 border-black bg-hotgreen text-[9px] font-bold text-black">
                        A
                      </div>
                      <div className="flex size-6 items-center justify-center rounded-full border-2 border-black bg-highlight text-[9px] font-bold text-black">
                        K
                      </div>
                      <div className="flex size-6 items-center justify-center rounded-full border-2 border-black bg-gray-500 text-[9px] font-bold text-white">
                        M
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-end justify-between bg-black p-4 text-white">
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-ultra text-hotgreen">
                          Net balance
                        </p>
                        <p className="text-4xl font-bold">+2,450</p>
                      </div>
                      <div className="text-right">
                        <div className="mb-1 bg-hotgreen px-2 py-0.5 text-[9px] font-bold text-black">
                          &uarr; 12%
                        </div>
                        <p className="text-[9px] text-gray-400">vs last trip</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-hotgreen p-3 text-black">
                        <p className="mb-1 text-[9px] uppercase tracking-ultra">
                          Owed to you
                        </p>
                        <p className="text-xl font-bold">4,250</p>
                      </div>
                      <div className="border-2 border-black bg-white p-3">
                        <p className="mb-1 text-[9px] uppercase tracking-ultra text-textsec">
                          You owe
                        </p>
                        <p className="text-xl font-bold text-error">1,800</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Blocks */}
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        {/* Block 1: White — numbered features */}
        <div className="border border-gray-200 bg-white p-8 shadow-md sm:p-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="mb-4 text-5xl font-bold text-hotgreen">01</div>
              <h3 className="mb-3 text-2xl font-bold">ADD EXPENSES</h3>
              <p className="text-lg text-textsec">
                Snap a receipt or type the amount. Split equally or custom. Done
                in 3 taps.
              </p>
            </div>
            <div>
              <div className="mb-4 text-5xl font-bold text-hotgreen">02</div>
              <h3 className="mb-3 text-2xl font-bold">TRACK BALANCES</h3>
              <p className="text-lg text-textsec">
                See who owes what, in real time. No spreadsheets. No mental
                math.
              </p>
            </div>
            <div>
              <div className="mb-4 text-5xl font-bold text-hotgreen">03</div>
              <h3 className="mb-3 text-2xl font-bold">SETTLE UP</h3>
              <p className="text-lg text-textsec">
                One tap to send money via UPI. Balances clear. Everyone&apos;s
                happy.
              </p>
            </div>
          </div>
        </div>

        {/* Block 2: Black — Why Splitfree */}
        <div className="bg-black p-8 text-white sm:p-12">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
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
                back?&quot; shouldn&apos;t ruin your weekend. Built for India,
                powered by UPI.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-hotgreen p-6 text-black">
                <div className="mb-1 text-4xl font-bold">2M+</div>
                <div className="text-sm font-medium uppercase tracking-ultra">
                  Users
                </div>
              </div>
              <div className="bg-white p-6 text-black">
                <div className="mb-1 text-4xl font-bold">50Cr+</div>
                <div className="text-sm font-medium uppercase tracking-ultra">
                  Settled
                </div>
              </div>
              <div className="bg-white p-6 text-black">
                <div className="mb-1 text-4xl font-bold">10L+</div>
                <div className="text-sm font-medium uppercase tracking-ultra">
                  Groups
                </div>
              </div>
              <div className="bg-highlight p-6 text-black">
                <div className="mb-1 text-4xl font-bold">4.8</div>
                <div className="text-sm font-medium uppercase tracking-ultra">
                  Rating
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Block 3: Green CTA */}
        <div className="bg-hotgreen p-8 sm:p-12">
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
