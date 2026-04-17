import { NextRequest, NextResponse } from "next/server";
import { getContentToken } from "@/lib/content-token";

const TRANSLATION_ID = "85"; // M.A.S. Abdel Haleem (available on pre-prod)

interface ApiWord {
  id: number;
  position: number;
  text_uthmani?: string;
  text?: string;
  char_type_name: string;
  translation?: { text: string; language_name: string };
  transliteration?: { text: string; language_name: string };
}

// Build full-verse transliteration by joining word transliterations
function buildTransliteration(words: ApiWord[]): string {
  return words
    .filter((w) => w.char_type_name === "word" && w.transliteration?.text)
    .map((w) => w.transliteration!.text)
    .join(" ");
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const verseKey = params.get("verse_key");
  const chapter = params.get("chapter");
  const fields = params.get("fields") || "text_uthmani";
  const page = params.get("page") || "1";
  const perPage = params.get("per_page") || "10";

  try {
    const token = await getContentToken();
    const apiUrl = process.env.QF_CONTENT_API_URL!;
    const authHeaders = {
      "x-auth-token": token,
      "x-client-id": process.env.QF_CLIENT_ID!,
    };

    if (verseKey) {
      // Fetch verse (with words) + translation in parallel
      const [verseRes, transRes] = await Promise.all([
        fetch(
          `${apiUrl}/verses/by_key/${verseKey}?words=true&fields=${fields}`,
          { headers: authHeaders, next: { revalidate: 3600 } }
        ),
        fetch(
          `${apiUrl}/quran/translations/${TRANSLATION_ID}?verse_key=${verseKey}`,
          { headers: authHeaders, next: { revalidate: 3600 } }
        ),
      ]);

      if (!verseRes.ok) {
        const text = await verseRes.text();
        return NextResponse.json({ error: text }, { status: verseRes.status });
      }

      const verseData = await verseRes.json();

      // Build transliteration from words
      if (verseData.verse?.words) {
        verseData.verse.transliteration = buildTransliteration(verseData.verse.words);
      }

      // Attach translation
      if (transRes.ok) {
        const transData = await transRes.json();
        verseData.verse.translations = (transData.translations || []).map(
          (t: { resource_id: number; text: string }) => ({
            id: t.resource_id,
            text: t.text,
            resource_name: transData.meta?.translation_name || "Translation",
          })
        );
      }

      return NextResponse.json(verseData);
    } else if (chapter) {
      // Fetch chapter verses with words
      const verseRes = await fetch(
        `${apiUrl}/verses/by_chapter/${chapter}?words=true&fields=${fields}&page=${page}&per_page=${perPage}`,
        { headers: authHeaders, next: { revalidate: 3600 } }
      );

      if (!verseRes.ok) {
        const text = await verseRes.text();
        return NextResponse.json({ error: text }, { status: verseRes.status });
      }

      const verseData = await verseRes.json();
      const verses = verseData.verses || [];

      // Build transliteration + fetch translations for all verses in parallel
      const transResults = await Promise.all(
        verses.map(async (v: { verse_key: string; words?: ApiWord[] }) => {
          // Build transliteration from words
          if (v.words) {
            (v as Record<string, unknown>).transliteration = buildTransliteration(v.words);
          }

          try {
            const res = await fetch(
              `${apiUrl}/quran/translations/${TRANSLATION_ID}?verse_key=${v.verse_key}`,
              { headers: authHeaders }
            );
            if (!res.ok) return null;
            const d = await res.json();
            return {
              verse_key: v.verse_key,
              translations: (d.translations || []).map(
                (t: { resource_id: number; text: string }) => ({
                  id: t.resource_id,
                  text: t.text,
                  resource_name: d.meta?.translation_name || "Translation",
                })
              ),
            };
          } catch {
            return null;
          }
        })
      );

      // Attach translations
      const transMap = new Map<string, { id: number; text: string; resource_name: string }[]>();
      for (const tr of transResults) {
        if (tr) transMap.set(tr.verse_key, tr.translations);
      }
      for (const v of verses) {
        v.translations = transMap.get(v.verse_key) || [];
      }

      return NextResponse.json(verseData);
    } else {
      return NextResponse.json({ error: "Provide verse_key or chapter" }, { status: 400 });
    }
  } catch (error) {
    console.error("Verse fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch verse" }, { status: 500 });
  }
}
