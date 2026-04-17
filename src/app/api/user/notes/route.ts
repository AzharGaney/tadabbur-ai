import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace("Bearer ", "");
}

const buildHeaders = (token: string) => ({
  "x-auth-token": token,
  "x-client-id": process.env.QF_CLIENT_ID!,
  "Content-Type": "application/json",
});

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = `${process.env.QF_USER_API_URL}/notes`;
  const outgoingHeaders = buildHeaders(token);

  console.log("\n========== [DEBUG /api/user/notes] ==========");
  console.log("Full URL:", url);
  console.log("x-client-id:", outgoingHeaders["x-client-id"]);
  console.log("x-auth-token (first 30 chars):", token.substring(0, 30) + "…");
  console.log("x-auth-token length:", token.length);

  const res = await fetch(url, { headers: outgoingHeaders });
  const body = await res.text();

  console.log("← Status:", res.status);
  console.log("← Body:", body.substring(0, 500));
  console.log("==============================================\n");

  try {
    return NextResponse.json(JSON.parse(body), { status: res.status });
  } catch {
    return NextResponse.json({ error: body }, { status: res.status });
  }
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body, verse_key, saveToQR } = await req.json();

  // ranges must be string[] in format "surah:ayah-surah:ayah"
  const ranges = verse_key ? [`${verse_key}-${verse_key}`] : undefined;

  const payload = { body, ranges, saveToQR: saveToQR || false };
  const url = `${process.env.QF_USER_API_URL}/notes`;

  console.log("[notes POST] →", url, JSON.stringify(payload));
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  const resBody = await res.text();
  console.log("[notes POST] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}
