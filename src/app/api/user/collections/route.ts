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

  const url = `${process.env.QF_USER_API_URL}/collections?first=20`;
  console.log("[collections GET] →", url);
  const res = await fetch(url, { headers: headers(token) });
  const resBody = await res.text();
  console.log("[collections GET] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // QF API requires { name: string }
  const payload = { name: body.name || body.title || "My Collection" };

  const url = `${process.env.QF_USER_API_URL}/collections`;
  console.log("[collections POST] →", url, JSON.stringify(payload));
  const res = await fetch(url, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const resBody = await res.text();
  console.log("[collections POST] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}
