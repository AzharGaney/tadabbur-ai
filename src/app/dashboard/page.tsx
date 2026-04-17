"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";

const ActivityHeatmap = dynamic(
  () => import("@/components/dashboard/activity-heatmap").then((m) => m.ActivityHeatmap),
  {
    loading: () => (
      <div className="h-[120px] rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] animate-pulse" />
    ),
  }
);

interface Streak {
  current: number;
  longest: number;
}

interface Goal {
  id: string;
  type?: string;
  target?: number;
  progress?: number;
  description?: string;
}

interface ReadingSession {
  id: string;
  duration?: number;
  created_at: string;
}

interface ActivityDay {
  date: string;
  count: number;
}

export default function DashboardPage() {
  const { isAuthenticated, getAccessToken, login } = useAuth();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    (async () => {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const [streakRes, activityRes, goalRes, sessionsRes] = await Promise.allSettled([
        fetch("/api/user/streaks", { headers }),
        fetch("/api/user/activity", { headers }),
        fetch("/api/user/goals?today=true", { headers }),
        fetch("/api/user/reading-sessions", { headers }),
      ]);

      if (streakRes.status === "fulfilled" && streakRes.value.ok) {
        const d = await streakRes.value.json();
        // QF returns { data: [{id, days, status, startDate, endDate}], pagination }
        const streaks = d.data || [];
        const active = streaks.find((s: { status: string }) => s.status === "ACTIVE");
        const longest = streaks.reduce(
          (max: number, s: { days: number }) => Math.max(max, s.days || 0),
          0
        );
        setStreak({
          current: active?.days ?? 0,
          longest,
        });
      }

      if (activityRes.status === "fulfilled" && activityRes.value.ok) {
        const d = await activityRes.value.json();
        const days = d.data || d.activity_days || d.activityDays || [];
        setActivityDays(
          (Array.isArray(days) ? days : []).map((a: { date?: string; created_at?: string; createdAt?: string; count?: number; pagesRead?: number; versesRead?: number; progress?: number }) => ({
            date: a.date || a.createdAt?.split("T")[0] || a.created_at?.split("T")[0] || "",
            count: Math.round(a.count || a.versesRead || a.pagesRead || 1),
          }))
        );
      }

      if (goalRes.status === "fulfilled" && goalRes.value.ok) {
        const d = await goalRes.value.json();
        setGoal(d.goal || d.data || d);
      }

      if (sessionsRes.status === "fulfilled" && sessionsRes.value.ok) {
        const d = await sessionsRes.value.json();
        setSessions(d.reading_sessions || d.data || []);
      }

      setLoading(false);
    })();
  }, [isAuthenticated, getAccessToken]);

  // Compute weekly reading time
  const weeklyMinutes = sessions
    .filter((s) => {
      const d = new Date(s.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    })
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 gap-4">
        <h1 className="text-2xl font-semibold">Your Dashboard</h1>
        <p className="text-[var(--text-secondary)]">Sign in to track your progress.</p>
        <button
          onClick={login}
          className="rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 sm:p-5 text-center space-y-2">
                  <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[var(--border-color)]" />
                  <div className="h-6 w-10 mx-auto rounded bg-[var(--border-color)]" />
                  <div className="h-3 w-16 mx-auto rounded bg-[var(--border-color)]" />
                </div>
              ))}
            </div>
            <div className="h-[120px] rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)]" />
          </div>
        ) : (
          <>
            {/* Streak + Stats Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Current Streak */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 sm:p-5 text-center space-y-1 sm:space-y-2">
                <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gold-500/10 flex items-center justify-center">
                  <span className="text-xl text-gold-500">&#9734;</span>
                </div>
                <p className="text-xl sm:text-3xl font-bold text-emerald-700">
                  {streak?.current ?? 0}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Day Streak</p>
              </div>

              {/* Longest Streak */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 sm:p-5 text-center space-y-1 sm:space-y-2">
                <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-emerald-600/10 flex items-center justify-center">
                  <span className="text-xl text-emerald-600">&#9650;</span>
                </div>
                <p className="text-xl sm:text-3xl font-bold text-emerald-700">
                  {streak?.longest ?? 0}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Longest Streak</p>
              </div>

              {/* Reading Time */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 sm:p-5 text-center space-y-1 sm:space-y-2">
                <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-emerald-600/10 flex items-center justify-center">
                  <span className="text-xl text-emerald-600">&#9201;</span>
                </div>
                <p className="text-xl sm:text-3xl font-bold text-emerald-700">
                  {weeklyMinutes > 0 ? `${Math.round(weeklyMinutes)}m` : "0m"}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">This Week</p>
              </div>
            </div>

            {/* Goal Progress */}
            {goal && goal.target && (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Weekly Goal</h3>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {goal.progress || 0} / {goal.target}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {goal.description || `Reflect on ${goal.target} verses this week`}
                </p>
                <div className="h-2.5 rounded-full bg-emerald-600/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{
                      width: `${Math.min(100, ((goal.progress || 0) / goal.target) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Activity Heatmap */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
              <ActivityHeatmap days={activityDays} />
            </div>

            {/* Quick Action */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-center space-y-3">
              <p className="text-[var(--text-secondary)]">
                {streak && streak.current > 0
                  ? "Keep your streak alive — reflect on a verse today."
                  : "Start a new streak — reflect on a verse today."}
              </p>
              <Link
                href="/discover"
                className="inline-block rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
              >
                Discover a verse
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
