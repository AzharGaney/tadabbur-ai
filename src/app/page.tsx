import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col geo-pattern">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24 text-center">
        <div className="max-w-2xl space-y-8 fade-in">
          {/* Bismillah calligraphy */}
          <p
            lang="ar"
            dir="rtl"
            className="font-[var(--font-arabic)] text-2xl sm:text-3xl text-gold-500 bismillah-reveal"
          >
            &#xFDFD;
          </p>

          <p className="text-sm font-medium tracking-widest uppercase text-gold-500">
            Guided Quran Reflection
          </p>

          <h1 className="text-3xl font-semibold tracking-tight leading-tight sm:text-5xl md:text-6xl">
            From reading
            <br />
            to <span className="text-emerald-700 dark:text-emerald-400">reflecting</span>
          </h1>

          <p className="mx-auto max-w-lg text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
            Tadabbur AI helps you build a daily practice of contemplating the
            Quran. Discover verses that speak to your life, reflect deeply, and
            grow your connection day by day.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/discover"
              className="w-full sm:w-auto rounded-xl bg-emerald-700 px-8 py-3.5 text-white font-medium hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Start Reflecting
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto rounded-xl border border-[var(--border-color)] px-8 py-3.5 font-medium text-[var(--text-secondary)] hover:border-gold-500 hover:text-emerald-700 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--border-color)] bg-[var(--surface-card)] py-12 sm:py-20 px-4">
        <div className="mx-auto max-w-4xl space-y-10">
          <h2 className="text-center text-xs font-medium tracking-widest uppercase text-[var(--text-tertiary)]">
            How it works
          </h2>
          <div className="grid gap-8 sm:gap-12 md:grid-cols-3">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600 text-lg">
                1
              </div>
              <h3 className="font-semibold">Discover</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Search by what&apos;s on your mind or browse surahs. Find the
                verses that resonate with your life right now.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600 text-lg">
                2
              </div>
              <h3 className="font-semibold">Reflect</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                A guided, immersive flow: recitation, word-by-word meaning,
                translation, tafsir, and AI-powered reflection prompts.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600 text-lg">
                3
              </div>
              <h3 className="font-semibold">Journal</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Build a personal collection of reflections. Track your streak,
                set goals, and share with the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-6 px-4 text-center text-xs text-[var(--text-tertiary)]">
        Built with the Quran Foundation API ecosystem
      </footer>
    </div>
  );
}
