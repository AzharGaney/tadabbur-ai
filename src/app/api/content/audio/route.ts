import { NextRequest, NextResponse } from "next/server";
import { getContentToken } from "@/lib/content-token";

const QF_AUDIO_CDN = "https://audio.qurancdn.com/";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const chapter = params.get("chapter");
  const reciter = params.get("reciter") || "7"; // Mishary Rashid Alafasy

  if (!chapter) {
    return NextResponse.json({ error: "chapter is required" }, { status: 400 });
  }

  try {
    const token = await getContentToken();
    const apiUrl = process.env.QF_CONTENT_API_URL!;

    const res = await fetch(
      `${apiUrl}/chapter_recitations/${reciter}/${chapter}`,
      {
        headers: {
          "x-auth-token": token,
          "x-client-id": process.env.QF_CLIENT_ID!,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[audio] QF API error:", res.status, text);
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();

    // Normalize: extract audio_file from various response shapes
    const audioFile = data.audio_file || data.audio_files?.[0] || null;

    if (audioFile?.audio_url && !audioFile.url) {
      audioFile.url = audioFile.audio_url;
    }

    // Ensure the URL is absolute
    if (audioFile?.url && !audioFile.url.startsWith("http")) {
      audioFile.url = QF_AUDIO_CDN + audioFile.url;
    }

    console.log("[audio] chapter:", chapter, "url:", audioFile?.url || "none");

    return NextResponse.json({ audio_file: audioFile });
  } catch (error) {
    console.error("Audio fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch audio" }, { status: 500 });
  }
}
