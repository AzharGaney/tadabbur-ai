"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";

type Tab = "notes" | "bookmarks" | "collections";

interface Note {
  id: string;
  body: string;
  verse_key?: string;
  created_at: string;
}

interface Bookmark {
  id: string;
  key: number;
  verseNumber?: number;
  type: string;
  verse_ref: string; // computed: "key:verseNumber" for ayah, or just "key" for surah/juz
  created_at: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export default function JournalPage() {
  const { isAuthenticated, getAccessToken, login } = useAuth();
  const [tab, setTab] = useState<Tab>("notes");
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [surahFilter, setSurahFilter] = useState("");

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

      const [notesRes, bookmarksRes, collectionsRes] = await Promise.allSettled([
        fetch("/api/user/notes", { headers }),
        fetch("/api/user/bookmarks", { headers }),
        fetch("/api/user/collections", { headers }),
      ]);

      if (notesRes.status === "fulfilled" && notesRes.value.ok) {
        const d = await notesRes.value.json();
        const rawNotes = d.data || d.notes || [];
        // QF notes use ranges array instead of verse_key
        setNotes(
          rawNotes.map((n: Record<string, unknown>) => ({
            id: n.id,
            body: n.body,
            verse_key:
              n.verse_key ||
              (Array.isArray(n.ranges) && (n.ranges as Array<Record<string, string>>).length > 0
                ? (n.ranges as Array<Record<string, string>>)[0].startVerseKey
                : undefined),
            created_at: (n.createdAt as string) || (n.created_at as string) || "",
          }))
        );
      }
      if (bookmarksRes.status === "fulfilled" && bookmarksRes.value.ok) {
        const d = await bookmarksRes.value.json();
        const rawBookmarks = d.data || d.bookmarks || [];
        setBookmarks(
          rawBookmarks.map((b: Record<string, unknown>) => {
            const key = Number(b.key);
            const verseNumber = b.verseNumber != null ? Number(b.verseNumber) : undefined;
            const type = (b.type as string) || "ayah";
            // Build a displayable verse reference
            const verse_ref =
              type === "ayah" && verseNumber != null
                ? `${key}:${verseNumber}`
                : String(key);
            return {
              id: b.id,
              key,
              verseNumber,
              type,
              verse_ref,
              created_at: (b.createdAt as string) || (b.created_at as string) || "",
            };
          })
        );
      }
      if (collectionsRes.status === "fulfilled" && collectionsRes.value.ok) {
        const d = await collectionsRes.value.json();
        const rawCollections = d.data || d.collections || [];
        setCollections(
          rawCollections.map((c: Record<string, unknown>) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            created_at: (c.createdAt as string) || (c.created_at as string) || "",
          }))
        );
      }

      setLoading(false);
    })();
  }, [isAuthenticated, getAccessToken]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (surahFilter && n.verse_key && !n.verse_key.startsWith(surahFilter + ":")) return false;
      if (search && !n.body.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [notes, search, surahFilter]);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      if (surahFilter && String(b.key) !== surahFilter) return false;
      if (search && !b.verse_ref.includes(search)) return false;
      return true;
    });
  }, [bookmarks, search, surahFilter]);

  // Extract unique surah numbers from notes + bookmarks
  const surahOptions = useMemo(() => {
    const surahs = new Set<string>();
    notes.forEach((n) => {
      if (n.verse_key) surahs.add(n.verse_key.split(":")[0]);
    });
    bookmarks.forEach((b) => {
      if (b.key) surahs.add(String(b.key));
    });
    return Array.from(surahs).sort((a, b) => Number(a) - Number(b));
  }, [notes, bookmarks]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 gap-4">
        <h1 className="text-2xl font-semibold">Your Reflection Journal</h1>
        <p className="text-[var(--text-secondary)]">
          Sign in to view your reflections, bookmarks, and collections.
        </p>
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
        <h1 className="text-2xl font-semibold">My Journal</h1>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-emerald-600/10 p-1 overflow-x-auto">
          {(["notes", "bookmarks", "collections"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t
                  ? "bg-[var(--surface-elevated)] text-emerald-700 shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-foreground"
              }`}
            >
              {t === "notes"
                ? `Reflections${notes.length ? ` (${notes.length})` : ""}`
                : t === "bookmarks"
                  ? `Bookmarks${bookmarks.length ? ` (${bookmarks.length})` : ""}`
                  : `Collections${collections.length ? ` (${collections.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Search + Filter */}
        {tab !== "collections" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "notes" ? "Search reflections..." : "Search bookmarks..."}
              className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {surahOptions.length > 0 && (
              <select
                value={surahFilter}
                onChange={(e) => setSurahFilter(e.target.value)}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Surahs</option>
                {surahOptions.map((s) => (
                  <option key={s} value={s}>
                    Surah {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 space-y-3">
                <div className="h-5 w-16 rounded-full bg-[var(--border-color)]" />
                <div className="h-4 w-full rounded bg-[var(--border-color)]" />
                <div className="h-4 w-3/4 rounded bg-[var(--border-color)]" />
                <div className="h-3 w-24 rounded bg-[var(--border-color)]" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Notes Tab */}
            {tab === "notes" && (
              <div className="space-y-4 fade-in">
                {filteredNotes.length === 0 ? (
                  <EmptyState
                    message={
                      notes.length > 0
                        ? "No reflections match your filters."
                        : "No reflections yet. Start your journey."
                    }
                  />
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 space-y-3"
                    >
                      {note.verse_key && (
                        <Link
                          href={`/reflect/${note.verse_key}`}
                          className="inline-flex items-center rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          {note.verse_key}
                        </Link>
                      )}
                      <p className="font-serif leading-relaxed">{note.body}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Bookmarks Tab */}
            {tab === "bookmarks" && (
              <div className="space-y-3 fade-in">
                {filteredBookmarks.length === 0 ? (
                  <EmptyState
                    message={
                      bookmarks.length > 0
                        ? "No bookmarks match your filters."
                        : "No bookmarks yet. Verses are bookmarked when you save a reflection."
                    }
                  />
                ) : (
                  filteredBookmarks.map((bm) => (
                    <Link
                      key={bm.id}
                      href={`/reflect/${bm.verse_ref}`}
                      className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 hover:border-gold-500/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600/10 text-sm font-medium text-emerald-700">
                          {bm.verse_ref}
                        </span>
                        <div>
                          <p className="text-sm font-medium">Verse {bm.verse_ref}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {formatDate(bm.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-blue-600">Reflect &rarr;</span>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Collections Tab */}
            {tab === "collections" && (
              <div className="space-y-3 fade-in">
                {collections.length === 0 ? (
                  <EmptyState message="No collections yet." />
                ) : (
                  collections.map((col) => (
                    <div
                      key={col.id}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 space-y-2"
                    >
                      <h3 className="font-medium">{col.name}</h3>
                      {col.description && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          {col.description}
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {formatDate(col.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 space-y-4">
      <p className="text-[var(--text-secondary)]">{message}</p>
      <Link
        href="/discover"
        className="inline-block rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
      >
        Discover a verse
      </Link>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
