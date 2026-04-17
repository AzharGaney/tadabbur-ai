import { NextRequest, NextResponse } from "next/server";
import { getContentToken } from "@/lib/content-token";

// Production API for content reads — pre-live only has partial data
const QF_PUBLIC_API = "https://api.quran.com/api/v4";

export async function GET(req: NextRequest) {
  const language = req.nextUrl.searchParams.get("language") || "en";

  try {
    // First try the configured (pre-live) content API
    const token = await getContentToken();
    const apiUrl = process.env.QF_CONTENT_API_URL!;

    const res = await fetch(`${apiUrl}/chapters?language=${language}&per_page=200`, {
      headers: {
        "x-auth-token": token,
        "x-client-id": process.env.QF_CLIENT_ID!,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const chapters = Array.isArray(data) ? data : data.chapters || [];
      if (chapters.length >= 114) {
        return NextResponse.json({ chapters });
      }
      console.log(`[chapters] Pre-live returned only ${chapters.length} chapters, falling back to production API`);
    }

    // Fallback: public production API (no auth needed for content reads)
    const fallbackRes = await fetch(`${QF_PUBLIC_API}/chapters?language=${language}`);
    if (!fallbackRes.ok) {
      const text = await fallbackRes.text();
      return NextResponse.json({ error: text }, { status: fallbackRes.status });
    }

    const fallbackData = await fallbackRes.json();
    const chapters = Array.isArray(fallbackData) ? fallbackData : fallbackData.chapters || [];
    console.log(`[chapters] Production API returned ${chapters.length} chapters`);
    return NextResponse.json({ chapters });
  } catch (error) {
    console.error("Chapters fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
  }
}
