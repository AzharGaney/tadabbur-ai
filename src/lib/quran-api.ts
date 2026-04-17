// Quran Foundation Content API client
// All calls go through Next.js API routes to keep tokens server-side

export interface Chapter {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: number[];
  translated_name: { language_name: string; name: string };
}

export interface Word {
  id: number;
  position: number;
  text_uthmani: string;
  translation: { text: string; language_name: string };
  transliteration: { text: string; language_name: string };
}

export interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  text_imlaei?: string;
  transliteration?: string;
  words?: Word[];
  translations?: { id: number; text: string; resource_name: string }[];
}

export interface Tafsir {
  text: string;
  resource_name: string;
  language_name: string;
}

export interface AudioFile {
  url: string;
  duration: number;
  format: string;
  verse_timings?: { verse_key: string; timestamp_from: number; timestamp_to: number }[];
}

// Content API helpers — these call our own API routes which proxy to QF
const BASE = "";

export async function fetchChapters(language = "en"): Promise<Chapter[]> {
  const res = await fetch(`${BASE}/api/content/chapters?language=${language}`);
  if (!res.ok) throw new Error("Failed to fetch chapters");
  const data = await res.json();
  return data.chapters;
}

export async function fetchVersesByChapter(
  chapterId: number,
  page = 1,
  perPage = 10,
  translations = "20,131"
): Promise<{ verses: Verse[]; pagination: { total_pages: number; current_page: number } }> {
  const params = new URLSearchParams({
    chapter: chapterId.toString(),
    page: page.toString(),
    per_page: perPage.toString(),
    translations,
    word_fields: "text_uthmani,translation",
    word_translation_language: "en",
    fields: "text_uthmani",
  });
  const res = await fetch(`${BASE}/api/content/verse?${params}`);
  if (!res.ok) throw new Error("Failed to fetch verses");
  return res.json();
}

export async function fetchVerseByKey(
  verseKey: string,
  translations = "20,131"
): Promise<Verse> {
  const params = new URLSearchParams({
    verse_key: verseKey,
    translations,
    word_fields: "text_uthmani,translation",
    word_translation_language: "en",
    fields: "text_uthmani",
  });
  const res = await fetch(`${BASE}/api/content/verse?${params}`);
  if (!res.ok) throw new Error("Failed to fetch verse");
  const data = await res.json();
  return data.verse;
}

export async function fetchTafsir(
  verseKey: string,
  tafsirId = 169 // Ibn Kathir (English)
): Promise<Tafsir> {
  const params = new URLSearchParams({
    verse_key: verseKey,
    tafsir_id: tafsirId.toString(),
  });
  const res = await fetch(`${BASE}/api/content/tafsir?${params}`);
  if (!res.ok) throw new Error("Failed to fetch tafsir");
  const data = await res.json();
  return data.tafsir;
}

export async function fetchAudio(
  chapterNumber: number,
  reciterId = 7 // Mishary Rashid Alafasy
): Promise<AudioFile> {
  const params = new URLSearchParams({
    chapter: chapterNumber.toString(),
    reciter: reciterId.toString(),
  });
  const res = await fetch(`${BASE}/api/content/audio?${params}`);
  if (!res.ok) throw new Error("Failed to fetch audio");
  const data = await res.json();
  return data.audio_file;
}

export async function searchSemantic(query: string): Promise<Verse[]> {
  const res = await fetch(`${BASE}/api/search/semantic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Failed to search");
  const data = await res.json();
  return data.verses;
}

export async function fetchReflectionPrompts(
  arabicText: string,
  translationText: string,
  tafsirSummary: string,
  userQuery?: string
): Promise<string[]> {
  const res = await fetch(`${BASE}/api/reflect/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ arabicText, translationText, tafsirSummary, userQuery }),
  });
  if (!res.ok) throw new Error("Failed to generate prompts");
  const data = await res.json();
  return data.prompts;
}
