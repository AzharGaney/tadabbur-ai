import { NextRequest, NextResponse } from "next/server";

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

  const { postId, body } = await req.json();
  if (!postId || !body) {
    return NextResponse.json({ error: "postId and body required" }, { status: 400 });
  }

  const numericPostId = Number(postId);
  const url = `${process.env.QF_USER_API_URL}/posts/${numericPostId}/comments`;
  const payload = { body };
  console.log("[comments POST] →", url, JSON.stringify(payload));

  const res = await fetch(url, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });

  const resBody = await res.text();
  console.log("[comments POST] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}
