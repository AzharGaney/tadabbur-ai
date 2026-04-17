"use client";

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  days: ActivityDay[];
}

export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  // Build a map of date -> count
  const dayMap = new Map<string, number>();
  days.forEach((d) => dayMap.set(d.date, d.count));

  // Generate 52 weeks x 7 days grid (364 days back from today)
  const today = new Date();
  const cells: { date: string; count: number; dayOfWeek: number }[] = [];

  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    cells.push({
      date: dateStr,
      count: dayMap.get(dateStr) || 0,
      dayOfWeek: d.getDay(),
    });
  }

  // Group into weeks (columns)
  const weeks: typeof cells[] = [];
  let currentWeek: typeof cells = [];
  for (const cell of cells) {
    if (cell.dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(cell);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const totalReflections = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Activity</h3>
        <span className="text-xs text-[var(--text-tertiary)]">
          {totalReflections} reflection{totalReflections !== 1 ? "s" : ""} this year
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-[3px] min-w-fit">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.count} reflection${cell.count !== 1 ? "s" : ""}`}
                  className="w-[11px] h-[11px] rounded-[2px] transition-colors"
                  style={{
                    backgroundColor:
                      cell.count === 0
                        ? "var(--border-color)"
                        : cell.count === 1
                          ? "var(--color-emerald-200)"
                          : cell.count === 2
                            ? "var(--color-emerald-400)"
                            : cell.count >= 3
                              ? "var(--color-emerald-600)"
                              : "var(--color-emerald-800)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-xs text-[var(--text-tertiary)]">
        <span>Less</span>
        <div className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: "var(--border-color)" }} />
        <div className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: "var(--color-emerald-200)" }} />
        <div className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: "var(--color-emerald-400)" }} />
        <div className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: "var(--color-emerald-600)" }} />
        <span>More</span>
      </div>
    </div>
  );
}
