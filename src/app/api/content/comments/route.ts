import { NextRequest, NextResponse } from "next/server";
import { getContentToken } from "@/lib/content-token";

const QR_API = process.env.QF_REFLECT_API_URL || "https://apis-prelive.quran.foundation/quran-reflect/v1";

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  try {
    // Prefer user token, fall back to content token
    const userToken = req.headers.get("authorization")?.replace("Bearer ", "");
    const token = userToken || await getContentToken();

    const url = `${QR_API}/posts/${postId}/comments`;
    console.log("[comments GET] →", url);
    const res = await fetch(url, {
      headers: {
        "x-auth-token": token,
        "x-client-id": process.env.QF_CLIENT_ID!,
      },
    });
    const resBody = await res.text();
    console.log("[comments GET] ←", res.status, resBody.substring(0, 300));

    if (!res.ok) {
      return NextResponse.json({ comments: [] });
    }

    try {
      return NextResponse.json(JSON.parse(resBody));
    } catch {
      return NextResponse.json({ comments: [] });
    }
  } catch {
    return NextResponse.json({ comments: [] });
  }
}
