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
  const params = new URLSearchParams({ type, first });

  const url = `${process.env.QF_USER_API_URL}/streaks?${params}`;
  console.log("[streaks GET] →", url);
  const res = await fetch(url, { headers: headers(token) });
  const resBody = await res.text();
  console.log("[streaks GET] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}
