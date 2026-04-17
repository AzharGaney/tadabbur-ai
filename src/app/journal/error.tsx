"use client";

export default function JournalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 gap-4">
      <h2 className="text-xl font-semibold">Failed to load journal</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        {error.message || "Could not load your reflections."}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
