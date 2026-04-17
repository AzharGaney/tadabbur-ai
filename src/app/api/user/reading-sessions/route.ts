import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace("Bearer ", "");
}

const headers = (token: string) => ({
  "x-auth-token": token,
  "x-client-id": process.env.QF_CLIENT_ID!,
  "Content-Type": "application/json",
});

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const first = req.nextUrl.searchParams.get("first") || "20";
  const url = `${process.env.QF_USER_API_URL}/reading-sessions?first=${first}`;
  console.log("[reading-sessions GET] →", url);
  const res = await fetch(url, { headers: headers(token) });
  const resBody = await res.text();
  console.log("[reading-sessions GET] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verse_key } = await req.json();

  // Parse verse_key "2:255" into chapterNumber and verseNumber
  const [chapterNumber, verseNumber] = (verse_key || "").split(":").map(Number);

  const res = await fetch(`${process.env.QF_USER_API_URL}/reading-sessions`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ chapterNumber, verseNumber }),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
