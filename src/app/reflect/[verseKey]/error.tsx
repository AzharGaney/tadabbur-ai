"use client";

import { useRouter } from "next/navigation";

export default function ReflectError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 gap-4">
      <h2 className="text-xl font-semibold">Reflection couldn&apos;t load</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        {error.message || "Something went wrong loading this verse."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => router.push("/discover")}
          className="rounded-xl border border-[var(--border-color)] px-6 py-3 text-[var(--text-secondary)] hover:border-gold-500/50 transition-colors"
        >
          Back to Discover
        </button>
      </div>
    </div>
  );
}
