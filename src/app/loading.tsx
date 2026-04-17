export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="h-8 w-8 mx-auto rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
      </div>
    </div>
  );
}
