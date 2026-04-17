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

  const { postId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const res = await fetch(`${process.env.QF_USER_API_URL}/posts/${postId}/like`, {
    method: "POST",
    headers: headers(token),
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
