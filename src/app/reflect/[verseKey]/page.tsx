"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import type { Verse, Tafsir, Word } from "@/lib/quran-api";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS = [
  "Recitation",
  "Word by Word",
  "Translation",
  "Tafsir",
  "Reflect",
  "Write",
  "Complete",
];

export default function ReflectionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ReflectionFlow />
    </Suspense>
  );
}

function ReflectionFlow() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, getAccessToken } = useAuth();

  const verseKey = decodeURIComponent(params.verseKey as string);
  const userQuery = searchParams.get("q") || undefined;

  const [step, setStep] = useState<Step>(1);
  const [slideDir, setSlideDir] = useState<"right" | "left">("right");
  const [verse, setVerse] = useState<Verse | null>(null);
  const [tafsir, setTafsir] = useState<Tafsir | null>(null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [reflection, setReflection] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`draft_${verseKey}`) || "";
    }
    return "";
  });
  const [saveMode, setSaveMode] = useState<"public" | "private" | "both">("private");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [streakCount, setStreakCount] = useState<number | null>(null);
  const [publishWarning, setPublishWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  // Autosave draft reflection to localStorage
  useEffect(() => {
    if (reflection) {
      localStorage.setItem(`draft_${verseKey}`, reflection);
    }
  }, [reflection, verseKey]);

  // Clear draft on successful save
  useEffect(() => {
    if (saved) {
      localStorage.removeItem(`draft_${verseKey}`);
    }
  }, [saved, verseKey]);

  const goForward = useCallback(() => {
    setSlideDir("right");
    setStep((s) => (s + 1) as Step);
  }, []);

  const goBack = useCallback(() => {
    setSlideDir("left");
    setStep((s) => (s - 1) as Step);
  }, []);

  // Load verse data
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({
          verse_key: verseKey,
          translations: "20,131",
          word_fields: "text_uthmani,translation",
          word_translation_language: "en",
          fields: "text_uthmani",
        });
        const res = await fetch(`/api/content/verse?${params}`);
        const data = await res.json();
        setVerse(data.verse);
      } catch (e) {
        console.error("Failed to load verse:", e);
      }
      setLoading(false);
    })();
  }, [verseKey]);

  // Load audio
  useEffect(() => {
    const chapterNumber = verseKey.split(":")[0];
    fetch(`/api/content/audio?chapter=${chapterNumber}`)
      .then((r) => r.json())
      .then((data) => {
        const url = data.audio_file?.url || data.audio_file?.audio_url;
        if (url) {
          setAudioUrl(url);
        }
      })
      .catch(console.error);
  }, [verseKey]);

  // Load tafsir when reaching step 4
  useEffect(() => {
    if (step >= 4 && !tafsir) {
      fetch(`/api/content/tafsir?verse_key=${verseKey}`)
        .then((r) => r.json())
        .then((data) => setTafsir(data.tafsir))
        .catch(console.error);
    }
  }, [step, tafsir, verseKey]);

  // Generate reflection prompts at step 5
  useEffect(() => {
    if (step === 5 && prompts.length === 0 && verse) {
      setLoadingPrompts(true);
      const translation = verse.translations?.[0]?.text?.replace(/<[^>]*>/g, "") || "";
      const tafsirText = tafsir?.text?.replace(/<[^>]*>/g, "").slice(0, 500) || "";

      fetch("/api/reflect/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arabicText: verse.text_uthmani,
          translationText: translation,
          tafsirSummary: tafsirText,
          userQuery,
        }),
      })
        .then((r) => r.json())
        .then((data) => setPrompts(data.prompts || []))
        .catch(console.error)
        .finally(() => setLoadingPrompts(false));
    }
  }, [step, prompts.length, verse, tafsir, userQuery]);

  const toggleAudio = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSave = useCallback(async () => {
    if (!reflection.trim() || reflection.trim().length < 6) return;
    setSaving(true);

    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      // Save reflection
      // "both" → posts endpoint creates note with saveToQR: true (private + public in one call)
      // "public" → posts endpoint (saveToQR: true)
      // "private" → notes endpoint (saveToQR: false)
      if (saveMode === "public" || saveMode === "both") {
        const postRes = await fetch("/api/user/posts", {
          method: "POST",
          headers,
          body: JSON.stringify({ body: reflection, verse_key: verseKey }),
        });
        if (postRes.ok) {
          const postData = await postRes.json();
          if (postData._publishWarning) {
            setPublishWarning(postData._publishWarning);
          }
        } else {
          setPublishWarning("Your reflection was saved privately. Publishing to the community feed is temporarily unavailable.");
        }
      } else if (saveMode === "private") {
        await fetch("/api/user/notes", {
          method: "POST",
          headers,
          body: JSON.stringify({ body: reflection, verse_key: verseKey }),
        });
      }

      // Auto-bookmark
      try {
        const bmRes = await fetch("/api/user/bookmarks", {
          method: "POST",
          headers,
          body: JSON.stringify({ key: verseKey, type: "ayah" }),
        });
        if (!bmRes.ok) {
          const bmErr = await bmRes.json().catch(() => ({}));
          // 422 = already bookmarked, which is fine
          if (bmRes.status === 422) {
            console.log("[auto-bookmark] Already bookmarked", verseKey);
          } else {
            console.error("[auto-bookmark] Failed:", bmRes.status, bmErr);
          }
        } else {
          console.log("[auto-bookmark] Bookmarked", verseKey);
        }
      } catch (bmError) {
        console.error("[auto-bookmark] Exception:", bmError);
      }

      // Log activity day (this also updates streak on the server)
      await fetch("/api/user/activity", {
        method: "POST",
        headers,
        body: JSON.stringify({ verse_key: verseKey }),
      });

      // Log reading session
      await fetch("/api/user/reading-sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({ verse_key: verseKey }),
      });

      // Fetch updated streak — QF returns { data: [{days, status}] }
      const streakRes = await fetch("/api/user/streaks", { headers });
      if (streakRes.ok) {
        const streakData = await streakRes.json();
        const streaks = streakData.data || [];
        const active = streaks.find((s: { status: string }) => s.status === "ACTIVE");
        setStreakCount(active?.days ?? 1);
      }

      setSaved(true);
      setStep(7);
    } catch (e) {
      console.error("Save error:", e);
    }
    setSaving(false);
  }, [reflection, saveMode, verseKey, getAccessToken]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!verse) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-[var(--text-secondary)]">Verse not found</p>
        <button
          onClick={() => router.push("/discover")}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-white text-sm"
        >
          Back to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-screen geo-pattern">
      {/* Step Indicator */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-[var(--border-color)] py-2 sm:py-3 px-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <button
            onClick={() => (step === 1 ? router.back() : goBack())}
            className="text-sm text-[var(--text-secondary)] hover:text-foreground"
          >
            {step === 1 ? "Exit" : "Back"}
          </button>

          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ease-out ${
                    i + 1 === step
                      ? "w-6 bg-emerald-600 step-active"
                      : i + 1 < step
                        ? "w-2 bg-emerald-400"
                        : "w-2 bg-[var(--border-color)]"
                  }`}
                />
              </div>
            ))}
          </div>

          <span className="text-xs text-[var(--text-tertiary)]">
            {step}/7
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-8 sm:py-12" style={{ justifyContent: step >= 6 ? "flex-start" : "center" }}>
        <div className={`w-full max-w-2xl ${slideDir === "right" ? "slide-in-right" : "slide-in-left"}`} key={step}>
          {/* Step 1: Recitation */}
          {step === 1 && (
            <div className="text-center space-y-8">
              <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
                Listen & Absorb
              </p>
              <p
                lang="ar"
                dir="rtl"
                className="font-[var(--font-arabic)] text-2xl sm:text-4xl md:text-5xl leading-[2] text-center"
              >
                {verse.text_uthmani}
              </p>
              {verse.transliteration && (
                <p className="text-base italic text-[var(--text-tertiary)] leading-relaxed max-w-xl mx-auto">
                  {verse.transliteration}
                </p>
              )}
              <p className="text-sm text-[var(--text-tertiary)]">{verse.verse_key}</p>

              {audioUrl && (
                <>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setPlaying(false)}
                  />
                  <button
                    onClick={toggleAudio}
                    className="mx-auto flex items-center gap-2 rounded-full border border-[var(--border-color)] px-6 py-3 text-sm hover:border-gold-500/50 transition-colors"
                  >
                    {playing ? (
                      <>
                        <span className="w-4 h-4 flex items-center justify-center">||</span>
                        Pause
                      </>
                    ) : (
                      <>
                        <span className="w-4 h-4 flex items-center justify-center">&#9654;</span>
                        Play Recitation
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Word by Word */}
          {step === 2 && (
            <div className="space-y-8">
              <p className="text-center text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
                Word by Word
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4" dir="rtl">
                {(verse.words || []).map((word: Word) => (
                  <div
                    key={word.id}
                    className="flex flex-col items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-2 sm:p-3 min-w-[60px] sm:min-w-[80px]"
                  >
                    <span
                      lang="ar"
                      className="font-[var(--font-arabic)] text-lg sm:text-2xl"
                    >
                      {word.text_uthmani}
                    </span>
                    {word.transliteration && (
                      <span className="text-xs text-[var(--text-tertiary)] italic">
                        {word.transliteration.text}
                      </span>
                    )}
                    {word.translation && (
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        {word.translation.text}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {(!verse.words || verse.words.length === 0) && (
                <p className="text-center text-[var(--text-tertiary)]">
                  Word-by-word data not available for this verse.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Translation */}
          {step === 3 && (
            <div className="space-y-8">
              <p className="text-center text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
                Translation
              </p>
              <p
                lang="ar"
                dir="rtl"
                className="font-[var(--font-arabic)] text-2xl leading-[2] text-center text-[var(--text-secondary)]"
              >
                {verse.text_uthmani}
              </p>
              {verse.transliteration && (
                <p className="text-sm italic text-[var(--text-tertiary)] text-center leading-relaxed">
                  {verse.transliteration}
                </p>
              )}
              {(verse.translations || []).map((t) => (
                <div key={t.id} className="space-y-2">
                  <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase">
                    {t.resource_name}
                  </p>
                  <p
                    className="font-serif text-lg leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: t.text }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Tafsir */}
          {step === 4 && (
            <div className="space-y-8">
              <p className="text-center text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
                Scholarly Commentary
              </p>
              {tafsir ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-[var(--text-tertiary)]">
                    {tafsir.resource_name}
                  </p>
                  <div
                    className="font-serif text-base leading-relaxed text-[var(--text-secondary)] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: tafsir.text }}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="h-6 w-6 mx-auto rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                  <p className="mt-3 text-sm text-[var(--text-tertiary)]">
                    Loading tafsir...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Reflection Prompts */}
          {step === 5 && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
                  Contemplate
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Reflection prompts to help you contemplate
                </p>
              </div>
              {loadingPrompts ? (
                <div className="text-center py-8">
                  <div className="h-6 w-6 mx-auto rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                  <p className="mt-3 text-sm text-[var(--text-tertiary)]">
                    Generating reflection prompts...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prompts.map((prompt, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5"
                    >
                      <p className="text-xs font-medium text-emerald-600 mb-2">
                        {i === 0
                          ? "Self-examination"
                          : i === 1
                            ? "Gratitude & Action"
                            : "Conversation with Allah"}
                      </p>
                      <p className="font-serif leading-relaxed">{prompt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 6: Write Reflection */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
                  Write Your Reflection
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Take a moment to write what this verse means to you.
                </p>
              </div>

              {/* Show prompts as guidance */}
              {prompts.length > 0 && (
                <div className="rounded-lg border border-emerald-600/20 bg-emerald-600/10 p-4 space-y-2">
                  <p className="text-xs font-medium text-emerald-600">
                    Prompts to guide you:
                  </p>
                  {prompts.map((p, i) => (
                    <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      &bull; {p}
                    </p>
                  ))}
                </div>
              )}

              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="My reflection on this verse..."
                rows={8}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-base font-serif leading-relaxed placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />

              {/* Save options */}
              <div className="flex items-center gap-3">
                <p className="text-sm text-[var(--text-secondary)]">Save as:</p>
                {(["private", "public", "both"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSaveMode(mode)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      saveMode === mode
                        ? "bg-emerald-700 text-white"
                        : "border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-gold-500/50"
                    }`}
                  >
                    {mode === "private"
                      ? "Private Note"
                      : mode === "public"
                        ? "Publish"
                        : "Both"}
                  </button>
                ))}
              </div>

              {!isAuthenticated && (
                <p className="text-xs text-gold-500">
                  Sign in to save your reflection to your account.
                </p>
              )}

              <button
                onClick={handleSave}
                disabled={saving || reflection.trim().length < 6}
                className="w-full rounded-xl bg-emerald-700 py-3.5 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Reflection"}
              </button>
            </div>
          )}

          {/* Step 7: Completion */}
          {step === 7 && (
            <div className="text-center space-y-8">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-600/10 flex items-center justify-center">
                <span className="text-3xl text-emerald-700">&#10003;</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">
                  Your reflection has been saved
                </h2>
                <p className="text-[var(--text-secondary)]">
                  May Allah accept your contemplation and increase your
                  understanding.
                </p>
              </div>

              {publishWarning && (
                <div className="rounded-lg bg-gold-500/10 border border-gold-500/20 px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {publishWarning}
                </div>
              )}

              {streakCount !== null && (
                <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-5 py-2.5 streak-pulse">
                  <span className="text-gold-500 text-lg">&#9734;</span>
                  <span className="font-semibold text-gold-500">
                    {streakCount} day streak
                  </span>
                </div>
              )}

              <div className="flex flex-col items-center gap-3 w-full sm:flex-row sm:justify-center">
                <button
                  onClick={() => router.push("/discover")}
                  className="w-full sm:w-auto rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
                >
                  Reflect on another verse
                </button>
                <button
                  onClick={() => router.push("/journal")}
                  className="w-full sm:w-auto rounded-xl border border-[var(--border-color)] px-6 py-3 text-[var(--text-secondary)] hover:border-gold-500/50 transition-colors"
                >
                  View your journal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button (Steps 1-5) */}
      {step <= 5 && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-[var(--border-color)] py-4 px-4">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={goForward}
              className="w-full rounded-xl bg-emerald-700 py-3.5 text-white font-medium hover:bg-emerald-600 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
