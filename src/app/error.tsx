"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 gap-6">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center">
          <span className="text-2xl text-gold-500">!</span>
        </div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="w-full sm:w-auto rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/discover"
            className="w-full sm:w-auto rounded-xl border border-[var(--border-color)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] hover:border-gold-500/50 transition-colors text-center"
          >
            Go to Discover
          </Link>
        </div>
      </div>
    </div>
  );
}
