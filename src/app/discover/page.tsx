"use client";

import { useState, useEffect, useCallback } from "react";
import { VerseCard } from "@/components/ui/verse-card";
import type { Chapter, Verse } from "@/lib/quran-api";
import Link from "next/link";

function SurahSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--border-color)]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-20 rounded bg-[var(--border-color)]" />
          <div className="h-2.5 w-14 rounded bg-[var(--border-color)]" />
        </div>
      </div>
      <div className="mt-3 h-5 w-24 rounded bg-[var(--border-color)] ml-auto" />
    </div>
  );
}

function VotdSkeleton() {
  return (
    <div className="rounded-xl border border-gold-500/20 bg-[var(--surface-elevated)] p-5 sm:p-6 animate-pulse">
      <div className="h-3 w-28 rounded bg-[var(--border-color)] mb-4" />
      <div className="h-8 w-3/4 rounded bg-[var(--border-color)] ml-auto mb-3" />
      <div className="h-4 w-full rounded bg-[var(--border-color)] mb-1" />
      <div className="h-4 w-2/3 rounded bg-[var(--border-color)]" />
    </div>
  );
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    { verse_key: string; arabic_text: string; translation_text: string; transliteration?: string }[]
  >([]);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [versePage, setVersePage] = useState(1);
  const [totalVersePages, setTotalVersePages] = useState(1);

  // Verse of the Day
  const [votd, setVotd] = useState<Verse | null>(null);
  const [loadingVotd, setLoadingVotd] = useState(true);

  useEffect(() => {
    fetch("/api/content/verse-of-the-day")
      .then((r) => r.json())
      .then((data) => { if (data.verse) setVotd(data.verse); })
      .catch(console.error)
      .finally(() => setLoadingVotd(false));
  }, []);

  const fetchChapters = useCallback(async () => {
    setLoadingChapters(true);
    setChaptersError(null);
    try {
      const r = await fetch("/api/content/chapters?language=en");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to load surahs");
      setChapters(data.chapters || []);
    } catch (e) {
      setChaptersError(e instanceof Error ? e.message : "Failed to load surahs");
    }
    setLoadingChapters(false);
  }, []);

  useEffect(() => { fetchChapters(); }, [fetchChapters]);

  const loadVerses = useCallback(
    async (chapterId: number, page: number) => {
      setLoadingVerses(true);
      try {
        const params = new URLSearchParams({
          chapter: chapterId.toString(),
          page: page.toString(),
          per_page: "10",
          translations: "85",
          word_fields: "text_uthmani,translation",
          word_translation_language: "en",
          fields: "text_uthmani",
        });
        const res = await fetch(`/api/content/verse?${params}`);
        const data = await res.json();
        setVerses(data.verses || []);
        setTotalVersePages(data.pagination?.total_pages || 1);
      } catch (e) {
        console.error(e);
      }
      setLoadingVerses(false);
    },
    []
  );

  useEffect(() => {
    if (selectedChapter) {
      loadVerses(selectedChapter, versePage);
    }
  }, [selectedChapter, versePage, loadVerses]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSearchError(null);
    setSelectedChapter(null);
    try {
      const res = await fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setSearchResults(data.verses || []);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed. Please try again.");
    }
    setSearching(false);
  }

  return (
    <div className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Search Section */}
        <div className="mb-8 sm:mb-12 text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            What&apos;s on your mind?
          </h1>
          <p className="text-[var(--text-secondary)]">
            Describe what you&apos;re feeling or going through, and we&apos;ll
            find verses that speak to your heart.
          </p>

          <form onSubmit={handleSearch} className="relative mt-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., I'm feeling anxious about the future..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-5 py-4 pr-24 text-base placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {[
              "I want to be more grateful",
              "Dealing with loss",
              "Patience in hardship",
              "Fear of the future",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-[var(--text-secondary)] hover:border-gold-500 hover:text-emerald-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center space-y-2 fade-in">
            <p className="text-sm text-red-700">{searchError}</p>
            <button
              onClick={() => { setSearchError(null); handleSearch(new Event("submit") as unknown as React.FormEvent); }}
              className="text-xs font-medium text-red-600 hover:text-red-800"
            >
              Try again
            </button>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-12 space-y-4 fade-in">
            <h2 className="text-lg font-semibold">Verses for you</h2>
            <div className="space-y-3">
              {searchResults.map((result) => (
                <VerseCard
                  key={result.verse_key}
                  verse={{
                    id: 0,
                    verse_number: 0,
                    verse_key: result.verse_key,
                    text_uthmani: result.arabic_text,
                    transliteration: result.transliteration,
                    translations: [{ id: 0, text: result.translation_text, resource_name: "" }],
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Verse of the Day */}
        {!selectedChapter && !searchResults.length && (
          <div className="mb-8 fade-in">
            <h2 className="text-lg font-semibold mb-3">Verse of the Day</h2>
            {loadingVotd ? (
              <VotdSkeleton />
            ) : votd ? (
              <Link href={`/reflect/${votd.verse_key}`} className="block group">
                <div className="rounded-xl border border-gold-500/20 bg-[var(--surface-elevated)] p-5 sm:p-6 transition-all hover:border-gold-500/40 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center rounded-full bg-gold-500/10 px-2.5 py-0.5 text-xs font-medium text-gold-600">
                      {votd.verse_key}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">Today&apos;s verse</span>
                  </div>
                  <p
                    lang="ar"
                    dir="rtl"
                    className="font-[var(--font-arabic)] text-xl sm:text-2xl leading-loose text-right mb-3 text-[var(--foreground)]"
                  >
                    {votd.text_uthmani}
                  </p>
                  {votd.transliteration && (
                    <p className="text-sm italic text-[var(--text-tertiary)] mb-3 leading-relaxed">
                      {votd.transliteration}
                    </p>
                  )}
                  {votd.translations?.[0]?.text && (
                    <p className="font-serif text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                      {votd.translations[0].text.replace(/<[^>]*>/g, "")}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Reflect on this verse &rarr;
                  </p>
                </div>
              </Link>
            ) : null}
          </div>
        )}

        {/* Surah Browser */}
        {!selectedChapter && (
          <div className="space-y-4 fade-in">
            <h2 className="text-lg font-semibold">Browse Surahs</h2>
            {loadingChapters ? (
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SurahSkeleton key={i} />
                ))}
              </div>
            ) : chaptersError ? (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-8 text-center space-y-3">
                <p className="text-[var(--text-secondary)]">{chaptersError}</p>
                <button
                  onClick={fetchChapters}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white font-medium hover:bg-emerald-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-2">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => { setSelectedChapter(ch.id); setVersePage(1); }}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-left hover:border-gold-500/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600/10 text-xs font-medium text-emerald-700">
                        {ch.id}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{ch.name_simple}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{ch.verses_count} verses</p>
                      </div>
                    </div>
                    <p lang="ar" dir="rtl" className="mt-2 text-right text-lg font-[var(--font-arabic)] text-gold-600">
                      {ch.name_arabic}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Verses in Selected Surah */}
        {selectedChapter && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setSelectedChapter(null); setVerses([]); }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                &larr; All Surahs
              </button>
              <h2 className="text-lg font-semibold">
                {chapters.find((c) => c.id === selectedChapter)?.name_simple}
              </h2>
            </div>

            {loadingVerses ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {verses.map((v) => (
                  <VerseCard key={v.verse_key} verse={v} />
                ))}
              </div>
            )}

            {totalVersePages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setVersePage((p) => Math.max(1, p - 1))}
                  disabled={versePage === 1}
                  className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-sm disabled:opacity-30 hover:border-gold-500/50"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--text-secondary)]">{versePage} / {totalVersePages}</span>
                <button
                  onClick={() => setVersePage((p) => Math.min(totalVersePages, p + 1))}
                  disabled={versePage === totalVersePages}
                  className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-sm disabled:opacity-30 hover:border-gold-500/50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
