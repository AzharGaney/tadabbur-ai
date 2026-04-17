import { NextRequest, NextResponse } from "next/server";
import { invalidateFeedCache } from "@/lib/feed-cache";

function getToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace("Bearer ", "");
}

const headers = (token: string) => ({
  "x-auth-token": token,
  "x-client-id": process.env.QF_CLIENT_ID!,
  "Content-Type": "application/json",
});

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body, verse_key } = await req.json();

  // ranges must be string[] in format "surah:ayah-surah:ayah"
  const ranges = verse_key ? [`${verse_key}-${verse_key}`] : undefined;

  // Create the note with saveToQR flag to auto-publish to QuranReflect
  const payload = { body, ranges, saveToQR: true };
  const url = `${process.env.QF_USER_API_URL}/notes`;
  console.log("[posts POST] →", url, JSON.stringify(payload));

  const noteRes = await fetch(url, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });

  const resBody = await noteRes.text();
  console.log("[posts POST] ←", noteRes.status, resBody.substring(0, 500));

  if (!noteRes.ok) {
    return NextResponse.json({ error: "Failed to publish reflection" }, { status: noteRes.status });
  }

  try {
    const data = JSON.parse(resBody);
    // QF may return 200 for the note but a nested error for QR publish
    if (data.data?.error) {
      console.log("[posts POST] note saved but QR publish failed:", data.data.error);
      console.log("[posts POST] QR publish error message:", data.data.message);
      // Return success with a warning — the note IS saved privately
      return NextResponse.json({
        ...data,
        _publishWarning: "Your reflection was saved but could not be published to the community feed. It will appear in your Journal.",
      });
    }

    // Invalidate feed cache so the user's new post appears immediately
    console.log("[posts POST] Success — invalidating feed cache");
    invalidateFeedCache();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: resBody }, { status: noteRes.status });
  }
}
