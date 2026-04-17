import { NextRequest, NextResponse } from "next/server";
import { getContentToken } from "@/lib/content-token";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const verseKey = params.get("verse_key");
  const tafsirId = params.get("tafsir_id") || "169"; // Ibn Kathir English

  if (!verseKey) {
    return NextResponse.json({ error: "verse_key is required" }, { status: 400 });
  }

  try {
    const token = await getContentToken();
    const apiUrl = process.env.QF_CONTENT_API_URL!;

    const res = await fetch(
      `${apiUrl}/tafsirs/${tafsirId}/by_ayah/${verseKey}?language=en`,
      {
        headers: {
          "x-auth-token": token,
          "x-client-id": process.env.QF_CLIENT_ID!,
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Tafsir fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch tafsir" }, { status: 500 });
  }
}
