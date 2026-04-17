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

  const type = req.nextUrl.searchParams.get("type") || "QURAN";
  const first = req.nextUrl.searchParams.get("first") || "20";
  const url = `${process.env.QF_USER_API_URL}/activity-days?type=${type}&first=${first}`;
  console.log("[activity GET] →", url);
  const res = await fetch(url, { headers: headers(token) });
  const resBody = await res.text();
  console.log("[activity GET] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // client may send no body — we'll build defaults
  }

  // Build the payload with required fields
  const verseKey = (body.verse_key as string) || "1:1";
  const seconds = (body.seconds as number) || 60;
  const payload = {
    type: (body.type as string) || "QURAN",
    seconds,
    ranges: [`${verseKey}-${verseKey}`],
    mushafId: (body.mushafId as number) || 1,
  };

  const url = `${process.env.QF_USER_API_URL}/activity-days`;
  console.log("[activity POST] →", url, JSON.stringify(payload));
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...headers(token),
      "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    body: JSON.stringify(payload),
  });
  const resBody = await res.text();
  console.log("[activity POST] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}
