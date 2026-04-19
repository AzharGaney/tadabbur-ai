import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace("Bearer ", "");
}

const QR_API = process.env.QF_REFLECT_API_URL!;

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId, body } = await req.json();
  if (!postId || !body) {
    return NextResponse.json({ error: "postId and body required" }, { status: 400 });
  }

  // Comments on QR posts go through the QuranReflect API, not the user API
  const url = `${QR_API}/posts/${postId}/comments`;
  console.log("[comments POST] →", url, JSON.stringify({ body }));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-auth-token": token,
      "x-client-id": process.env.QF_CLIENT_ID!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  const resBody = await res.text();
  console.log("[comments POST] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}
