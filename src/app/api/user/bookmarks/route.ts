import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest) {
  return req.headers.get("authorization")?.replace("Bearer ", "");
}

const headers = (token: string) => ({
  "x-auth-token": token,
  "x-client-id": process.env.QF_CLIENT_ID!,
  "Content-Type": "application/json",
});

// Default mushaf ID for Uthmani text
const DEFAULT_MUSHAF_ID = "1";

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mushafId = req.nextUrl.searchParams.get("mushafId") || DEFAULT_MUSHAF_ID;
  const type = req.nextUrl.searchParams.get("type") || "ayah";
  const first = req.nextUrl.searchParams.get("first") || "20";

  const params = new URLSearchParams({ mushafId, type, first });
  const after = req.nextUrl.searchParams.get("after");
  if (after) params.set("after", after);

  const url = `${process.env.QF_USER_API_URL}/bookmarks?${params}`;
  console.log("[bookmarks GET] →", url);
  const res = await fetch(url, { headers: headers(token) });
  const resBody = await res.text();
  console.log("[bookmarks GET] ←", res.status, resBody.substring(0, 300));

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
  const mushafId = Number(DEFAULT_MUSHAF_ID);

  // Client sends key as verse_key string (e.g. "2:255") — parse into surah + ayah
  let key = body.key;
  let verseNumber = body.verseNumber;
  if (typeof key === "string" && key.includes(":")) {
    const [surah, ayah] = key.split(":");
    key = Number(surah);
    verseNumber = verseNumber ?? Number(ayah);
  } else {
    key = Number(key);
  }

  const payload = {
    key,
    mushaf: mushafId,
    type: body.type || "ayah",
    ...(body.type === "ayah" || !body.type ? { verseNumber: Number(verseNumber) } : {}),
  };

  const url = `${process.env.QF_USER_API_URL}/bookmarks`;
  console.log("[bookmarks POST] →", url, JSON.stringify(payload));
  const res = await fetch(url, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const resBody = await res.text();
  console.log("[bookmarks POST] ←", res.status, resBody.substring(0, 500));

  try {
    return NextResponse.json(JSON.parse(resBody), { status: res.status });
  } catch {
    return NextResponse.json({ error: resBody }, { status: res.status });
  }
}
