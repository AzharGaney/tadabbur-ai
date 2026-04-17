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
  const today = req.nextUrl.searchParams.get("today") === "true";
  const endpoint = today ? `/goal/status?type=${type}` : `/goal?type=${type}`;

  const url = `${process.env.QF_USER_API_URL}${endpoint}`;
  console.log("[goals GET] →", url);
  const res = await fetch(url, { headers: headers(token) });
  const resBody = await res.text();
  console.log("[goals GET] ←", res.status, resBody.substring(0, 500));

  if (!res.ok) {
    // Return empty data on 403 (scope not granted) so dashboard doesn't break
    if (res.status === 403) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({ error: "Failed to fetch goal" }, { status: res.status });
  }

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") || "QURAN";
  const body = await req.json();
  const res = await fetch(`${process.env.QF_USER_API_URL}/goal?type=${type}`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PUT(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") || "QURAN";
  const body = await req.json();

  const res = await fetch(`${process.env.QF_USER_API_URL}/goal?type=${type}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
