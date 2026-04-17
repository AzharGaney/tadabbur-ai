import { NextResponse } from "next/server";
import { getContentToken } from "@/lib/content-token";

// Curated list of impactful verses for Verse of the Day
const FEATURED_VERSES = [
  "2:152", "2:186", "2:216", "2:255", "2:286",
  "3:139", "3:173", "3:185",
  "5:32",
  "6:59",
  "10:62",
  "13:28",
  "14:7",
  "16:97",
  "17:82",
  "20:114",
  "21:87",
  "23:115",
  "24:35",
  "29:69",
  "31:17",
  "33:41",
  "39:53",
  "40:60",
  "42:11",
  "49:13",
  "55:13",
  "65:3",
  "93:5",
  "94:5",
  "94:6",
];

function getVerseOfTheDay(): string {
  // Use day-of-year so it changes daily but is consistent throughout the day
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return FEATURED_VERSES[dayOfYear % FEATURED_VERSES.length];
}

const QF_PUBLIC_API = "https://api.quran.com/api/v4";
const TRANSLATION_ID = "85";

export async function GET() {
  const verseKey = getVerseOfTheDay();

  try {
    const token = await getContentToken();
    const apiUrl = process.env.QF_CONTENT_API_URL!;
    const authHeaders = {
      "x-auth-token": token,
      "x-client-id": process.env.QF_CLIENT_ID!,
    };

    // Fetch verse with words — try pre-live, fallback to production
    let verseRes = await fetch(
      `${apiUrl}/verses/by_key/${verseKey}?words=true&fields=text_uthmani&translations=${TRANSLATION_ID}`,
      { headers: authHeaders }
    );
    if (!verseRes.ok) {
      verseRes = await fetch(
        `${QF_PUBLIC_API}/verses/by_key/${verseKey}?words=true&fields=text_uthmani&translations=${TRANSLATION_ID}`
      );
    }
    if (!verseRes.ok) {
      return NextResponse.json({ error: "Failed to fetch verse" }, { status: 500 });
    }

    const verseData = await verseRes.json();
    const verse = verseData.verse;

    // Normalize translations: the ?translations= param embeds them in verse.translations
    // If empty (pre-live may lack translation data), fall back to the public API
    if (!verse.translations?.length) {
      try {
        const fallbackRes = await fetch(
          `${QF_PUBLIC_API}/verses/by_key/${verseKey}?fields=text_uthmani&translations=${TRANSLATION_ID}`
        );
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.verse?.translations?.length) {
            verse.translations = fallbackData.verse.translations;
          }
        }
      } catch {
        // translation fallback is non-critical
      }
    }

    // Build transliteration from words
    if (verse.words) {
      verse.transliteration = verse.words
        .filter((w: { char_type_name: string; transliteration?: { text: string } }) =>
          w.char_type_name === "word" && w.transliteration?.text
        )
        .map((w: { transliteration: { text: string } }) => w.transliteration.text)
        .join(" ");
    }

    return NextResponse.json({ verse });
  } catch (error) {
    console.error("Verse of the day error:", error);
    return NextResponse.json({ error: "Failed to fetch verse of the day" }, { status: 500 });
  }
}
